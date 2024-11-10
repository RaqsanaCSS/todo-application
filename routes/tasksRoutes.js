const express = require('express');
const tasksController = require('../controllers/tasksController');

const router = express.Router();

router.post('/add', tasksController.postTask);

module.exports = router;