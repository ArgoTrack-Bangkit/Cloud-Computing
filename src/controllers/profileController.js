const { admin, db } = require('../../config/firebaseAdminConfig');
const Profile = require('../models/profile');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Fungsi untuk membuat token JWT
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const register = (req, res) => {
    const { email, password, name, birthday, gender } = req.body;

    admin.auth().getUserByEmail(email)
        .then(userRecord => {
            res.status(400).send({ error: 'Email already exists' });
        })
        .catch(() => {
            bcrypt.hash(password, 10, (err, hash) => {
                if (err) {
                    return res.status(500).send({ error: 'Error hashing password: ' + err.message });
                }

                admin.auth().createUser({
                    email: email,
                    password: password,
                    displayName: name,
                })
                    .then(userRecord => {
                        const userProfile = new Profile(name, email, birthday, gender, hash);
                        const plainProfile = JSON.parse(JSON.stringify(userProfile));
                        db.collection('users').doc(userRecord.uid).set(plainProfile)
                            .then(() => {
                                // Setelah pengguna berhasil diregistrasi, buat token JWT dan kirimkan sebagai respons
                                const token = generateToken(userRecord.uid);
                                res.status(201).send({ message: 'User created successfully', user: userRecord, token });
                            })
                            .catch(error => {
                                res.status(400).send({ error: 'Error saving user data to Firestore: ' + error.message });
                            });
                    })
                    .catch(error => {
                        res.status(400).send({ error: 'Error creating user: ' + error.message });
                    });
            });
        });
};

const login = (req, res) => {
    const { email, password } = req.body;

    admin.auth().getUserByEmail(email)
        .then(userRecord => {
            db.collection('users').doc(userRecord.uid).get()
                .then(doc => {
                    if (!doc.exists) {
                        return res.status(404).send({ error: 'User data not found' });
                    }

                    const userProfile = doc.data();
                    bcrypt.compare(password, userProfile.password, (err, result) => {
                        if (err) {
                            return res.status(500).send({ error: 'Error comparing passwords: ' + err.message });
                        }
                        if (result) {
                            // Jika autentikasi berhasil, buat token JWT dan kirimkan sebagai respons
                            const token = generateToken(userRecord.uid);
                            res.status(200).send({ message: 'Login successful', user: userRecord, token });
                        } else {
                            res.status(400).send({ error: 'Incorrect password' });
                        }
                    });
                })
                .catch(error => {
                    res.status(400).send({ error: 'Error retrieving user data from Firestore: ' + error.message });
                });
        })
        .catch(() => {
            res.status(404).send({ error: 'Email not found' });
        });
};

// Middleware untuk memverifikasi token JWT
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).send({ error: 'Unauthorized: No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: 'Unauthorized: Invalid token' });
        }

        req.user = decoded;
        next();
    });
};

const getProfile = (req, res) => {
    const userEmail = req.params.email;

    admin.auth().getUserByEmail(userEmail)
        .then(userRecord => {
            const uid = userRecord.uid;
            db.collection('users').doc(uid).get()
                .then(doc => {
                    if (!doc.exists) {
                        res.status(404).send({ error: 'User data not found' });
                    } else {
                        const userProfile = doc.data();
                        delete userProfile.password;
                        res.status(200).send(userProfile);
                    }
                })
                .catch(error => {
                    res.status(400).send({ error: 'Error retrieving user data from Firestore: ' + error.message });
                });
        })
        .catch(() => {
            res.status(404).send({ error: 'Email not found' });
        });
};

const editProfile = (req, res) => {
    const userEmail = req.params.email;
    const { name, birthday, gender, newEmail } = req.body;

    admin.auth().getUserByEmail(userEmail)
        .then(userRecord => {
            const uid = userRecord.uid;

            const updates = {};
            if (name) updates.name = name;
            if (birthday) updates.birthday = new Date(birthday).toISOString().split('T')[0];
            if (gender) updates.gender = gender;
            if (newEmail) updates.email = newEmail;

            const plainProfile = JSON.parse(JSON.stringify(updates));

            db.collection('users').doc(uid).set(plainProfile, { merge: true })
                .then(() => {
                    const authUpdates = {};
                    if (name) authUpdates.displayName = name;
                    if (newEmail) authUpdates.email = newEmail;

                    admin.auth().updateUser(uid, authUpdates)
                        .then(() => {
                            res.status(200).send({ message: 'User profile updated successfully' });
                        })
                        .catch(error => {
                            res.status(400).send({ error: 'Error updating auth profile: ' + error.message });
                        });
                })
                .catch(error => {
                    res.status(400).send({ error: 'Error updating user profile: ' + error.message });
                });
        })
        .catch(() => {
            res.status(404).send({ error: 'Email not found' });
        });
};


const deleteAccount = (req, res) => {
    const userEmail = req.params.email;

    // Hapus akun dari Firebase Authentication
    admin.auth().getUserByEmail(userEmail)
        .then(userRecord => {
            const uid = userRecord.uid;

            admin.auth().deleteUser(uid)
                .then(() => {
                    db.collection('users').doc(uid).delete()
                        .then(() => {
                            res.status(200).send({ message: 'User account deleted successfully' });
                        })
                        .catch(error => {
                            res.status(400).send({ error: 'Error deleting user data from Firestore: ' + error.message });
                        });
                })
                .catch(error => {
                    res.status(400).send({ error: 'Error deleting user from auth: ' + error.message });
                });
        })
        .catch(() => {
            res.status(404).send({ error: 'Email not found' });
        });
};

const changePassword = (req, res) => {
    const userEmail = req.params.email;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.status(400).send({ error: 'New password and confirmation password do not match' });
    }

    admin.auth().getUserByEmail(userEmail)
        .then(userRecord => {
            const uid = userRecord.uid;

            db.collection('users').doc(uid).get()
                .then(doc => {
                    if (!doc.exists) {
                        return res.status(404).send({ error: 'User data not found' });
                    }

                    const userProfile = doc.data();
                    bcrypt.compare(oldPassword, userProfile.password, (err, result) => {
                        if (err) {
                            return res.status(500).send({ error: 'Error comparing passwords: ' + err.message });
                        }
                        if (!result) {
                            return res.status(400).send({ error: 'Old password is incorrect' });
                        }

                        bcrypt.hash(newPassword, 10, (err, hash) => {
                            if (err) {
                                return res.status(500).send({ error: 'Error hashing new password: ' + err.message });
                            }

                            db.collection('users').doc(uid).update({ password: hash })
                                .then(() => {
                                    admin.auth().updateUser(uid, { password: newPassword })
                                        .then(() => {
                                            res.status(200).send({ message: 'Password updated successfully' });
                                        })
                                        .catch(error => {
                                            res.status(400).send({ error: 'Error updating password in auth: ' + error.message });
                                        });
                                })
                                .catch(error => {
                                    res.status(400).send({ error: 'Error updating password in Firestore: ' + error.message });
                                });
                        });
                    });
                })
                .catch(error => {
                    res.status(400).send({ error: 'Error retrieving user data from Firestore: ' + error.message });
                });
        })
        .catch(() => {
            res.status(404).send({ error: 'Email not found' });
        });
};

module.exports = { register, login, getProfile, editProfile, deleteAccount, changePassword, generateToken, verifyToken };

