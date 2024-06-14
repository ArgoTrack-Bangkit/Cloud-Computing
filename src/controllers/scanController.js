const Scan = require('../models/scanModel');
const { Storage } = require('@google-cloud/storage');
const tf = require('@tensorflow/tfjs-node');
const { formatDate } = require('../utils/dateFormatter');

let model = null;

const loadModel = async () => {
  if (model) {
    console.log("Model already loaded.");
    return model;
  }

  const modelJsonUrl = process.env.MODEL_JSON_URL;

  console.log("Loading model from GCS URL...");
  model = await tf.loadLayersModel(modelJsonUrl);
  console.log("Model loaded successfully.");
  return model;
};

const predictImage = async (imageBuffer) => {
  try {
    const model = await loadModel();

    const image = tf.node.decodeImage(imageBuffer, 3);
    const resizedImage = tf.image.resizeBilinear(image, [150, 150]); // Sesuaikan dengan ukuran input model
    const normalizedImage = resizedImage.div(255.0).expandDims(0);

    console.log("Predicting image...");
    const predictions = model.predict(normalizedImage);
    const scores = predictions.dataSync();

    const labels = [
      "Blossom-end-rot",
      "Cracking",
      "Healthy",
      "Bukan Tomat",
      "Splitting",
      "Sun-scaled",
      
    ];

    // Tentukan ambang batas untuk validasi skor
    const threshold = 0.5;

    // Cari indeks skor tertinggi
    const maxIndex = scores.indexOf(Math.max(...scores));
    const maxScore = scores[maxIndex];

    console.log("Prediction completed.");

    // Validasi skor
    if (maxScore < threshold) {
      return "Bukan Tomat";
    } else {
      return labels[maxIndex];
    }
  } catch (error) {
    console.error("Error predicting image:", error);
    throw error;
  }
};



const generateNote = (status) => {
  switch (status) {
    case "Healthy":
      return "Tomatoes are healthy and suitable for sale";
    case "Cracking":
      return "Tomatoes are cracking. Check for water inconsistencies.";
    case "Blossom-end-rot":
      return "Tomatoes have blossom-end rot. Not suitable for sale.";
    case "Splitting":
      return "Tomatoes are splitting. Handle with care.";
    case "Sun-scaled":
      return "Tomatoes have sun-scaled damage. Monitor sun exposure.";
    default:
      return "Unknown status";
  }
};

exports.scanTomato = async (req, res) => {
  try {
    const userId = req.body.userId; // Asumsikan userId dikirim dalam body permintaan
    const file = req.file;

    // Validasi tipe file gambar
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG and JPG are allowed." });
    }

    // Prediksi status tomat
    const status = await predictImage(file.buffer);

    if (status === "Bukan Tomat") {
      return res.status(400).json({ error: "The image is not a tomato." });
    }

    // Upload gambar ke bucket Firebase Storage target
    const targetBucketName = process.env.FIREBASE_STORAGE_BUCKET;
    const targetBucket = new Storage().bucket(targetBucketName);

    const fileName = `${Date.now()}_${file.originalname}`;
    const fileUpload = targetBucket.file(fileName);
    await fileUpload.save(file.buffer);

    const imageUrl = `https://storage.googleapis.com/${targetBucketName}/${fileName}`;

    // Buat catatan berdasarkan status
    const note = generateNote(status);

    // Simpan hasil ke Firestore
    const scan = await Scan.create(userId, imageUrl, status, note);

    res.status(201).json({
      message: "Scan successful",
      scanData: scan,
    });
  } catch (error) {
    res.status(500).json({ error: `Error scanning tomato: ${error.message}` });
  }
};



exports.getAllUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    const scans = await Scan.getAllUsers(userId);

    res.status(200).json(scans);
  } catch (error) {
    res.status(500).json({ error: `Error getting scans by user ID: ${error.message}` });
  }
};

exports.getScanById = async (req, res) => {
  try {
    const { userId, scanId } = req.params;
    const scan = await Scan.getById(userId, scanId);

    res.status(200).json(scan);
  } catch (error) {
    res.status(500).json({ error: `Error getting scan by ID: ${error.message}` });
  }
};

exports.deleteScanById = async (req, res) => {
  try {
    const { userId, scanId } = req.params;
    await Scan.deleteById(userId, scanId);

    res.status(200).json({ message: "Scan deleted successfully" });
  } catch (error) {
    console.error(`Error deleting scan by ID: ${error.message}`);
    res.status(500).json({ error: `Error deleting scan by ID: ${error.message}` });
  }
};

// Optionally, to delete all scans for a user
exports.deleteAllScansByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const scans = await Scan.getAllUsers(userId);
    const deletePromises = scans.map(scan => Scan.deleteById(userId, scan.id));
    await Promise.all(deletePromises);

    res.status(200).json({ message: "All scans for the user deleted successfully" });
  } catch (error) {
    console.error(`Error deleting all scans for user: ${error.message}`);
    res.status(500).json({ error: `Error deleting all scans for user: ${error.message}` });
  }
};

