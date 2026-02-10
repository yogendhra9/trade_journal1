import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { startCronJobs } from './services/cron.service.js';
import { initSymbolCache } from './services/symbolLookup.service.js';

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Initialize symbol lookup cache
    initSymbolCache();
    
    // Start scheduled cron jobs
    startCronJobs();
});