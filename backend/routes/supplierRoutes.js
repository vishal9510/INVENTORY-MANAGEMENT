const express = require('express');
const supplierController = require('../controllers/supplierController');

const router = express.Router();

router.post('/', supplierController.addSupplier);
router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
