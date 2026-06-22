const { Router } = require('express')
const authenticate = require('../middlewares/auth')
const authorizeRoles = require('../middlewares/authorize')
const container = require('../config/container')

const router = Router()
const adminController = container.resolve('adminController')

router.get('/users', authenticate, authorizeRoles('admin'), adminController.getUsers.bind(adminController))

module.exports = router
