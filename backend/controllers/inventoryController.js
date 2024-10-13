const InventoryItem = require('../model/InventoryItem.model');
const { Parser } = require('json2csv');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Helper function to check and update low stock status
const checkLowStock = async (item) => {
  if (item.quantity < item.lowStockThreshold) {
    if (!item.isLowStock) {
      item.isLowStock = true;
      await item.save();
      // Optional: Implement notification logic here
    }
  } else {
    if (item.isLowStock) {
      item.isLowStock = false;
      await item.save();
    }
  }
};

// Add a single inventory item
const addInventoryItem = async (req, res) => {
  try {
    const newItem = new InventoryItem(req.body);
    await newItem.save();

     // Check for low stock upon creation
     await checkLowStock(newItem);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bulk add inventory items
const bulkAddInventoryItems = async (req, res) => {
  try {
    const items = req.body.items;
    const newItems = await InventoryItem.insertMany(items);
     // Check for low stock for each new item
     for (const item of newItems) {
      await checkLowStock(item);
    }
    res.status(201).json(newItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a single inventory item
const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedItem = await InventoryItem.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedItem) return res.status(404).json({ error: 'Item not found' });
     // Check for low stock for each new item
     for (const item of newItems) {
      await checkLowStock(item);
    }
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bulk update inventory items
const bulkUpdateInventoryItems = async (req, res) => {
  try {
    const updates = req.body.items;
    const updatePromises = updates.map((item) =>
      InventoryItem.findByIdAndUpdate(item.id, item.update, { new: true })
    );
    const updatedItems = await Promise.all(updatePromises);
    // Check for low stock for each updated item
    for (const item of updatedItems) {
      if (item) {
        await checkLowStock(item);
      }
    }
    res.status(200).json(updatedItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a single inventory item
const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await InventoryItem.findByIdAndDelete(id);
    if (!deletedItem) return res.status(404).json({ error: 'Item not found' });
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bulk delete inventory items
const bulkDeleteInventoryItems = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await InventoryItem.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ message: `${result.deletedCount} items deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all inventory items
const getAllInventoryItems = async (req, res) => {
  try {
    const items = await InventoryItem.find().populate('supplierId');
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single inventory item by ID
const getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await InventoryItem.findById(id).populate('supplierId');
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CSV Export: Download all inventory data as a CSV file
const exportInventoryToCSV = async (req, res) => {
  try {
    const items = await InventoryItem.find().populate('supplierId');

    // Prepare fields for the CSV file
    const fields = [
      { label: 'Item ID', value: '_id' },
      { label: 'Name', value: 'name' },
      { label: 'Quantity', value: 'quantity' },
      { label: 'Supplier', value: 'supplierId.name' },
      { label: 'Price', value: 'price' },
      { label: 'Description', value: 'description' },
      { label: 'Low Stock Threshold', value: 'lowStockThreshold' },
      { label: 'Is Low Stock', value: 'isLowStock' }
    ];

    // Convert JSON data to CSV
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(items);

    // Set CSV headers
    res.header('Content-Type', 'text/csv');
    res.attachment('inventory.csv');

    // Send the CSV file
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// CSV Import: Upload and update inventory items in bulk
const importInventoryFromCSV = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const itemsToUpdate = [];

    // Read and parse the CSV file
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        itemsToUpdate.push({
          name: row['Name'],
          quantity: parseInt(row['Quantity'], 10),
          supplierId: row['Supplier ID'], // Ensure Supplier IDs are correct
          price: parseFloat(row['Price']),
          description: row['Description'],
          lowStockThreshold: row['Low Stock Threshold'] ? parseInt(row['Low Stock Threshold'], 10) : undefined
        });
      })
      .on('end', async () => {
        try {
          // Bulk update or insert inventory items
          const bulkOperations = itemsToUpdate.map((item) => {
            const filter = { name: item.name }; // Assuming "name" is unique
            const update = { $set: item };
            const options = { upsert: true, new: true };
            return {
              updateOne: {
                filter,
                update,
                upsert: true
              }
            };
          });

          const bulkWriteResult = await InventoryItem.bulkWrite(bulkOperations);
          await bulkWriteResult.save();
          // Fetch the updated/inserted items to check low stock
          const updatedItems = await InventoryItem.find({ name: { $in: itemsToUpdate.map(i => i.name) } });

          for (const item of updatedItems) {
            await checkLowStock(item);
          }

          res.status(200).json({ message: 'Inventory updated successfully from CSV file.' });
        } catch (error) {
          res.status(500).json({ error: error.message });
        } finally {
          // Remove the uploaded CSV file after processing
          fs.unlinkSync(filePath);
        }
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get all low stock items
const getLowStockItems = async (req, res) => {
  try {
    const lowStockItems = await InventoryItem.find({ isLowStock: true }).populate('supplierId');
    res.status(200).json(lowStockItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Set or update low stock threshold for an inventory item
const setLowStockThreshold = async (req, res) => {
  try {
    const { id } = req.params;
    const { lowStockThreshold } = req.body;

    if (lowStockThreshold === undefined || lowStockThreshold < 0) {
      return res.status(400).json({ error: 'Invalid low stock threshold value' });
    }

    const updatedItem = await InventoryItem.findByIdAndUpdate(
      id,
      { lowStockThreshold },
      { new: true }
    );

    if (!updatedItem) return res.status(404).json({ error: 'Item not found' });

    // Re-check low stock status after updating the threshold
    await checkLowStock(updatedItem);

    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addInventoryItem,
  bulkAddInventoryItems,
  updateInventoryItem,
  bulkUpdateInventoryItems,
  deleteInventoryItem,
  bulkDeleteInventoryItems,
  getAllInventoryItems,
  getInventoryItemById,
  exportInventoryToCSV,
  importInventoryFromCSV,
  getLowStockItems,
  checkLowStock,
  setLowStockThreshold
};