const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../models');
const { authenticate, isSuperAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get settings
router.get('/', authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const settings = await db.SystemSettings.findAll();

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = {
        value: setting.value,
        type: setting.type,
        category: setting.category
      };
    });

    res.json(settingsObj);
  } catch (error) {
    next(error);
  }
});

// Update settings
router.put('/:key', authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const { value } = req.body;

    let setting = await db.SystemSettings.findOne({
      where: { key: req.params.key }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (!setting.canBeModified) {
      return res.status(403).json({
        error: 'This setting cannot be modified'
      });
    }

    const oldValue = setting.value;
    setting.value = value;
    await setting.save();

    // Log the change
    await db.AdminLog.create({
      adminId: req.user.id,
      action: 'update_setting',
      entityType: 'SystemSettings',
      entityId: setting.id,
      oldValues: { [req.params.key]: oldValue },
      newValues: { [req.params.key]: value },
      ipAddress: req.ip
    });

    logger.info(`Admin ${req.user.email} updated setting ${req.params.key}`);

    res.json(setting);
  } catch (error) {
    next(error);
  }
});

// SSL Configuration endpoints
const SSL_DIR = process.env.SSL_CERT_PATH
  ? path.dirname(process.env.SSL_CERT_PATH)
  : '/etc/ssl/certs';

// Get SSL status
router.get('/ssl/status', authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const certPath = process.env.SSL_CERT_PATH || path.join(SSL_DIR, 'server.crt');
    const keyPath = process.env.SSL_KEY_PATH || path.join(SSL_DIR, 'server.key');

    const certExists = fs.existsSync(certPath);
    const keyExists = fs.existsSync(keyPath);

    let certInfo = null;
    if (certExists) {
      const cert = fs.readFileSync(certPath, 'utf8');
      // Parse basic cert info
      const matches = cert.match(/CN=([^\n,]+)/);
      certInfo = {
        domain: matches ? matches[1] : 'Unknown',
        path: certPath,
        exists: true
      };
    }

    res.json({
      enabled: process.env.SSL_ENABLED === 'true',
      certExists,
      keyExists,
      certInfo,
      paths: {
        cert: certPath,
        key: keyPath
      }
    });
  } catch (error) {
    next(error);
  }
});

// Upload SSL certificate
router.post('/ssl/upload-cert', authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const { certContent, keyContent } = req.body;

    if (!certContent || !keyContent) {
      return res.status(400).json({
        error: 'Certificate and key content are required'
      });
    }

    const certPath = process.env.SSL_CERT_PATH || path.join(SSL_DIR, 'server.crt');
    const keyPath = process.env.SSL_KEY_PATH || path.join(SSL_DIR, 'server.key');

    // Create directory if it doesn't exist
    const certDir = path.dirname(certPath);
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true, mode: 0o700 });
    }

    // Write certificate
    fs.writeFileSync(certPath, certContent, { mode: 0o600 });
    fs.writeFileSync(keyPath, keyContent, { mode: 0o600 });

    await db.AdminLog.create({
      adminId: req.user.id,
      action: 'upload_ssl_certificate',
      ipAddress: req.ip
    });

    logger.info(`Admin ${req.user.email} uploaded SSL certificate`);

    res.json({
      message: 'SSL certificate uploaded successfully',
      paths: { cert: certPath, key: keyPath },
      notice: 'Please restart the server for changes to take effect'
    });
  } catch (error) {
    next(error);
  }
});

// Get email settings
router.get('/email', authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const emailSettings = await db.SystemSettings.findAll({
      where: { category: 'email' }
    });

    const settings = {};
    emailSettings.forEach(s => {
      settings[s.key] = s.value;
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Update email settings
router.put('/email/:key', authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const { value } = req.body;

    let setting = await db.SystemSettings.findOne({
      where: { key: req.params.key, category: 'email' }
    });

    if (!setting) {
      setting = await db.SystemSettings.create({
        key: req.params.key,
        value,
        category: 'email'
      });
    } else {
      setting.value = value;
      await setting.save();
    }

    await db.AdminLog.create({
      adminId: req.user.id,
      action: 'update_email_setting',
      entityType: 'SystemSettings',
      entityId: setting.id,
      newValues: { [req.params.key]: value },
      ipAddress: req.ip
    });

    res.json(setting);
  } catch (error) {
    next(error);
  }
});

// Get LLM settings
router.get('/llm', authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const llmSettings = await db.SystemSettings.findAll({
      where: { category: 'llm' }
    });

    const settings = {};
    llmSettings.forEach(s => {
      settings[s.key] = s.value;
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Update LLM settings
router.put('/llm/:key', authenticate, isSuperAdmin, async (req, res, next) => {
  try {
    const { value } = req.body;

    let setting = await db.SystemSettings.findOne({
      where: { key: req.params.key, category: 'llm' }
    });

    if (!setting) {
      setting = await db.SystemSettings.create({
        key: req.params.key,
        value,
        category: 'llm'
      });
    } else {
      setting.value = value;
      await setting.save();
    }

    logger.info(`Admin ${req.user.email} updated LLM setting ${req.params.key}`);

    res.json(setting);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
