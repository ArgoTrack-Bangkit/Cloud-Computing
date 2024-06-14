// models/scanModel.js
const { db } = require("../../config/firebaseAdminConfig");
const { formatDate } = require("../utils/dateFormatter");
const { Storage } = require('@google-cloud/storage');

class Scan {
  constructor(id, imageUrl, status, note, createdAt) {
    this.id = id;
    this.imageUrl = imageUrl;
    this.status = status;
    this.note = note;
    this.createdAt = createdAt;
  }

  static async create(userId, imageUrl, status, note) {
    const timestamp = new Date().toISOString();
    const formattedDate = formatDate(timestamp);

    const scanData = {
      imageUrl,  
      status,    
      note,
      createdAt: formattedDate,
    };

    const userScansRef = db.collection("users").doc(userId).collection("scans");
    const docRef = await userScansRef.add(scanData);
    return new Scan(docRef.id, imageUrl, status, note, formattedDate);
  }

  static async getAllUsers(userId) {
    const userScansRef = db.collection("users").doc(userId).collection("scans");
    const snapshot = await userScansRef.get();

    if (snapshot.empty) {
      throw new Error("No scans found for this user");
    }

    const scans = [];
    snapshot.forEach(doc => {
      const docData = doc.data();
      scans.push(new Scan(doc.id, docData.imageUrl, docData.status, docData.note, docData.createdAt));
    });
    return scans;
  }

  static async getById(userId, scanId) {
    const scanRef = db.collection("users").doc(userId).collection("scans").doc(scanId);
    const scanDoc = await scanRef.get();

    if (!scanDoc.exists) {
      throw new Error("Scan not found");
    }

    const scanData = scanDoc.data();
    return new Scan(scanDoc.id, scanData.imageUrl, scanData.status, scanData.note, scanData.createdAt);
  }

  static async deleteById(userId, scanId) {
    const scanRef = db.collection("users").doc(userId).collection("scans").doc(scanId);
    const scanDoc = await scanRef.get();

    if (!scanDoc.exists) {
      throw new Error("Scan not found");
    }

    // Delete the image from Firebase Storage
    const imageUrl = scanDoc.data().imageUrl;
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    const storage = new Storage();
    const fileName = imageUrl.split(`${bucketName}/`)[1];

    await storage.bucket(bucketName).file(fileName).delete();

    // Delete the document from Firestore
    await scanRef.delete();
    return true;
  }

  static async deleteAllScansByUser(userId) {
    const scansRef = db.collection("users").doc(userId).collection("scans");
    const snapshot = await scansRef.get();

    if (snapshot.empty) {
      throw new Error("No scans found for the user");
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    const storage = new Storage();

    const deletePromises = [];
    snapshot.forEach(doc => {
      const imageUrl = doc.data().imageUrl;
      const fileName = imageUrl.split(`${bucketName}/`)[1];
      deletePromises.push(storage.bucket(bucketName).file(fileName).delete());
      deletePromises.push(doc.ref.delete());
    });

    await Promise.all(deletePromises);
    return true;
  }
}

module.exports = Scan;