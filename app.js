const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const tasksRoutes = require('./routes/tasksRoutes');

const session = require('express-session');



const app = express();
app.use(express.static('public'));
app.use(session({
    secret: 'MY5tR0nGSesssssssi10K3i', // Replace with a real secret key
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 3600000 // Expires in 1 hour, adjust as needed
    }
}));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/auth', authRoutes);
app.use('/tasks', tasksRoutes);
app.use('/', homeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
