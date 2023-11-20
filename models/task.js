const db = require('../config/database');

class Task {
    constructor(title, description, ownerId) {
        this.title = title;
        this.description = description;
        this.ownerId = ownerId;
    }
    static findByUserEmail(userEmail) {
        return new Promise((resolve, reject) => {
            db.query('SELECT title,description FROM tasks WHERE owner_id = (SELECT id FROM users WHERE email = ?)', [userEmail], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    save() {
        return new Promise((resolve, reject) => {
            db.query(
                'INSERT INTO tasks (title, description, owner_id) VALUES (?, ?, ?)',
                [this.title, this.description, this.ownerId],
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
    }
}

module.exports = Task;
