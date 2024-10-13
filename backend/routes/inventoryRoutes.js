const express = require('express');
const { check, validationResult } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Add a single inventory item with validation (optional)
router.post('/', [
  check('name').not().isEmpty().withMessage('Name is required'),
  check('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  check('supplierId').isMongoId().withMessage('Invalid Supplier ID'),
  check('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  inventoryController.addInventoryItem(req, res, next);
});

// Bulk add inventory items with validation (optional)
router.post('/bulk', [
  check('items').isArray({ min: 1 }).withMessage('Items must be an array with at least one item'),
  check('items.*.name').not().isEmpty().withMessage('Each item must have a name'),
  check('items.*.quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  check('items.*.supplierId').isMongoId().withMessage('Invalid Supplier ID'),
  check('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  inventoryController.bulkAddInventoryItems(req, res, next);
});

// Update a single inventory item with validation (optional)
router.put('/:id', [
  check('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  check('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  check('supplierId').optional().isMongoId().withMessage('Invalid Supplier ID'),
  check('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  inventoryController.updateInventoryItem(req, res, next);
});

// Bulk update inventory items with validation (optional)
router.put('/bulk', [
  check('items').isArray({ min: 1 }).withMessage('Items must be an array with at least one item'),
  check('items.*.id').isMongoId().withMessage('Each item must have a valid ID'),
  check('items.*.update').not().isEmpty().withMessage('Each update must have update data')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  inventoryController.bulkUpdateInventoryItems(req, res, next);
});

// Delete a single inventory item
router.delete('/:id', inventoryController.deleteInventoryItem);

// Bulk delete inventory items
router.delete('/bulk', [
  check('ids').isArray({ min: 1 }).withMessage('IDs must be an array with at least one ID'),
  check('ids.*').isMongoId().withMessage('Each ID must be a valid Mongo ID')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  inventoryController.bulkDeleteInventoryItems(req, res, next);
});

// Get all inventory items
router.get('/', inventoryController.getAllInventoryItems);

// Get a single inventory item by ID
router.get('/:id', inventoryController.getInventoryItemById);

// Export inventory as CSV
router.get('/export/csv', inventoryController.exportInventoryToCSV);

// Import inventory from CSV with validation (optional)
router.post('/import/csv', upload.single('file'), inventoryController.importInventoryFromCSV);

// Low Stock Alert Routes
router.get('/alerts/low-stock', inventoryController.getLowStockItems);

// Set low stock threshold with validation
router.put('/:id/threshold', [
  check('lowStockThreshold')
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  inventoryController.setLowStockThreshold(req, res, next);
});

module.exports = router;
