const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MyModelSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'notes' });

const MyModel = mongoose.model('MyModel', MyModelSchema);

module.exports = MyModel;