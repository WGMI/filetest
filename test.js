const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Hardcoded token and sample file path
const TOKEN = '6e76d3f44a914a2fdb3d51fa1148e154d7747cc11c05bc0ead393a42143f79c26e651d7c2834d70ff24bba54a3196823a13c8cd290d27c62285cf4ea57eb4d7f9934e7d10312b3a67efb98c644581357515f07751e6721f0837b476bffd1b01645edb067b7320bd0be73be52c6291919e42dfe3258be4ee3e4c5562fa66cb2dca73c09eba4e96569b372d56ff2dadfb1ebf9ec7c21dce818e3690a8aeca202fa15a5ef96e45c1aebab8a596623868ede';
const SAMPLE_FILE_PATH = path.join(__dirname, 'uploads/cv.pdf'); // Replace with your file path
const EXTERNAL_API_URL = 'https://hokela-core-mr8oi.ondigitalocean.app/document/u-space'; // Replace with the actual API URL

// Function to upload the file
async function uploadToExternalServer() {
    try {
        // Check if the sample file exists
        if (!fs.existsSync(SAMPLE_FILE_PATH)) {
            console.error('Sample file does not exist:', SAMPLE_FILE_PATH);
            return;
        }

        // Prepare FormData
        const formData = new FormData();
        formData.append('file', fs.createReadStream(SAMPLE_FILE_PATH)); // Attach the sample file
        formData.append('filename', path.basename(SAMPLE_FILE_PATH)); // Use the file's name

        // Prepare headers
        const headers = {
            Authorization: `Bearer ${TOKEN}`, // Include the hardcoded token
            Client: 'APP_MOBILE',
            ...formData.getHeaders(), // Add FormData headers
        };

        // Send POST request to the external server
        console.log('Uploading file to external server...');
        const response = await axios.post(EXTERNAL_API_URL, formData, { headers });

        // Log the server response
        console.log('Upload successful! Server response:', response.data);
    } catch (error) {
        // Log any errors
        console.error('Error uploading file:', error.response?.data || error.message);
    }
}

// Execute the function
uploadToExternalServer();
