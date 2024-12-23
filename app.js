const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Initialize express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' })); // Allow parsing JSON with large payloads
app.use(express.urlencoded({ extended: true, limit: '100mb' })); // Allow parsing URL-encoded data with large payloads

app.use((req, res, next) => {
    const contentLength = req.headers['content-length'] || 0;
    console.log(`Request size: ${contentLength} bytes`);
    next();
});

const PORT = process.env.PORT || 3000;

// Ensure 'uploads' directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the API' });
})

app.post('/upload-audio', async (req, res) => {
    try {
        const { file, token, aiToken } = req.body;

        if (!file || !token || !aiToken) {
            return res.status(400).json({ 
                message: 'Audio file, token, and OpenAI token are required' 
            });
        }

        // Extract the base64 data and create a temporary file
        const base64Data = file.replace(/^data:audio\/\w+;base64,/, '');
        const audioFilePath = path.join(__dirname, 'uploads', `temp-${Date.now()}.mp3`);
        fs.writeFileSync(audioFilePath, base64Data, 'base64');

        // Create form data for OpenAI API
        const formData = new FormData();
        formData.append('file', fs.createReadStream(audioFilePath));
        formData.append('model', 'whisper-1');

        // Call OpenAI API for transcription
        const openaiResponse = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
                headers: {
                    'Authorization': `${aiToken}`,
                    ...formData.getHeaders(),
                }
            }
        );

        // Clean up the temporary file
        fs.unlinkSync(audioFilePath);

        res.status(200).json({
            message: 'Audio transcribed successfully',
            transcription: openaiResponse.data.text
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.post('/upload-base64', async (req, res) => {
    try {
        const { file, filename, token } = req.body;

        if (!file || !filename || !token) {
            return res.status(400).json({ message: 'Base64 string, filename, and token are required' });
        }

        const match = file.match(/^data:(.+);base64,/);
        const mimeType = match ? match[1] : null;

        let extension = '';
        if (mimeType) {
            const mimeToExtension = {
                'image/jpeg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'application/pdf': '.pdf',
                'text/plain': '.txt',
            };
            extension = mimeToExtension[mimeType] || '';
        }

        const filePath = path.join(
            __dirname,
            'uploads',
            filename.endsWith(extension) ? filename : `${filename}${extension}`
        );

        const base64Data = file.replace(/^data:.+;base64,/, '');
        fs.writeFileSync(filePath, base64Data, 'base64');

        const externalApiUrl = 'https://hokela-api-9uucl.ondigitalocean.app/document/u-space';
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('filename', filename);

        const headers = {
            Authorization: `Bearer ${token}`,
            Client: 'APP_MOBILE',
            ...formData.getHeaders(),
        };

        const externalApiResponse = await axios.post(externalApiUrl, formData, { headers });
        console.log(externalApiResponse);

        const filteredResponse = {
            id: externalApiResponse.data.id,
            destination: externalApiResponse.data.destination,
            path: externalApiResponse.data.path,
            fileName: externalApiResponse.data.fileName,
            size: externalApiResponse.data.size,
            mimetype: externalApiResponse.data.mimetype,
        };

        res.status(200).json({
            message: 'File created and uploaded successfully',
            filePath: `/uploads/${path.basename(filePath)}`,
            externalApiResponse: filteredResponse,
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    res.status(500).json({ message: 'Unknown Error', error: err.message });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
