const jwt = require('jsonwebtoken');

// Protect route middleware
const protect = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, "#######");
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Invalid token' });
    }
};




module.exports = {  protect };
