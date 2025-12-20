const fs = require('fs');
const path = require('path');

// Learning data storage path
const DATA_FILE_PATH = '/tmp/learning-data.json';

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const { httpMethod, path: requestPath, body } = event;
    
    // Learning data file path
    const dataFilePath = DATA_FILE_PATH;
    
    // Load learning data
    function loadLearningData() {
      try {
        if (fs.existsSync(dataFilePath)) {
          const data = fs.readFileSync(dataFilePath, 'utf8');
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('Learning data yüklenemedi:', error);
      }
      return {};
    }
    
    // Save learning data
    function saveLearningData(data) {
      try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
        return true;
      } catch (error) {
        console.error('Learning data kaydedilemedi:', error);
        return false;
      }
    }

    // Route handling
    if (httpMethod === 'GET') {
      if (requestPath.includes('/global')) {
        // Global learning data
        const learningData = loadLearningData();
        const globalData = {
          totalDevices: Object.keys(learningData).length,
          combinedData: {},
          lastUpdated: new Date().toISOString()
        };
        
        Object.keys(learningData).forEach(deviceId => {
          globalData.combinedData[deviceId] = learningData[deviceId];
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: globalData,
            message: 'Global learning data başarıyla alındı'
          }),
        };
      } else if (requestPath.includes('/api/learning-data/')) {
        // Specific device data
        const deviceId = requestPath.split('/').pop();
        const learningData = loadLearningData();
        
        if (learningData[deviceId]) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: learningData[deviceId],
              message: 'Learning data başarıyla alındı'
            }),
          };
        } else {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Bu device için learning data bulunamadı'
            }),
          };
        }
      } else {
        // All learning data
        const learningData = loadLearningData();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: learningData,
            message: 'Tüm learning data başarıyla alındı'
          }),
        };
      }
    } else if (httpMethod === 'POST') {
      // Save learning data
      const { deviceId, learningData } = JSON.parse(body || '{}');
      
      if (!deviceId || !learningData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'deviceId ve learningData gerekli'
          }),
        };
      }
      
      const allLearningData = loadLearningData();
      allLearningData[deviceId] = {
        ...learningData,
        lastUpdated: new Date().toISOString()
      };
      
      if (saveLearningData(allLearningData)) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Learning data başarıyla kaydedildi'
          }),
        };
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Learning data kaydedilemedi'
          }),
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed'
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message
      }),
    };
  }
};
