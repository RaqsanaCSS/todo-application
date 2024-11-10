const express = require('express');
const homeController = require('../controllers/homeController');

const router = express.Router();

router.get('/dashboard', homeController.getDashboard);

module.exports = router;