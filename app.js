const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Initialize express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow parsing JSON with large payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Allow parsing URL-encoded data with large payloads

const PORT = process.env.PORT || 3000;

// Ensure 'uploads' directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Set up multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Directory where files will be saved
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`); // Rename file with unique suffix
    },
});

const upload = multer({ storage });

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the API' });
})

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

        const externalApiUrl = 'https://hokela-core-mr8oi.ondigitalocean.app/document/u-space';
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('filename', filename);

        const headers = {
            Authorization: `Bearer ${token}`,
            Client: 'APP_MOBILE',
            ...formData.getHeaders(),
        };

        const externalApiResponse = await axios.post(externalApiUrl, formData, { headers });

        const filteredResponse = {
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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'Multer Error', error: err.message });
    }
    res.status(500).json({ message: 'Unknown Error', error: err.message });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
