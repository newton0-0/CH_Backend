const {spawn} = require('child_process');

const pythonProcess = spawn('python', ['crawler.py']); // or 'python3' if needed

try {
    pythonProcess.stdout.on('data', (data) => {
        const tenders = JSON.parse(data.toString());
        res.json(tenders);
    });
    
    pythonProcess.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
        res.status(500).send('Error running Python script');
    });
    
    pythonProcess.on('close', (code) => {
        console.log(`Python script finished with code ${code}`);
    });
    res.send('Hello Auther!');
} catch (error) {
    console.error(`Error: ${error}`);
}