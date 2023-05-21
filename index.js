var express = require("express")
var bodyParser = require("body-parser")
var mongoose = require("mongoose")

const methodOverride = require('method-override');

const path = require('path');
const bcrypt = require('bcrypt');

const app = express()
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://127.0.0.1:27017/miniproject?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.6.2';

const MyModel = require('./schema.js');

const dbName = 'miniproject';

const moment = require("moment");

const router = express.Router();

const { ObjectId } = require('mongodb');

const fs = require('fs');

app.set('view engine', 'ejs');

// app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json())
app.use(express.json());
app.use(express.static('public'))
app.use(express.urlencoded({
  extended: true
}))
app.use(bodyParser.urlencoded({
  extended: true
}))

app.use(methodOverride('_method'));

mongoose.set('strictQuery', true);

mongoose.connect('mongodb://127.0.0.1:27017/miniproject?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.6.2', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

var db = mongoose.connection;


db.on('error', () => console.log("Error in Connecting to Database"))
db.once('open', () => console.log("Connected to Database"))


app.use(express.static("public"));

app.use(methodOverride('_method'));


//login page route
app.post("/login", (req, res) => {
  var name = req.body.name;
  var password = req.body.password;

  // Find a user with the provided email in the database
  db.collection('users').findOne({ name: name }, (err, user) => {
    if (err) {
      throw err;
    }

    if (!user) {
      // If there is no user with the provided email, return an error message
      return res.status(401).send("INVALID EMAIL OR PASSWORD");
    }

    // Compare the provided password with the hashed password in the database
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        throw err;
      }

      if (result === true) {
        // If the password matches, redirect the user to the home page
        return res.redirect('devices');
      } else {
        // If the password doesn't match, return an error message
        return res.status(401).send("INVALID EMAIL OR PASSWORD");
      }
    });
  });
});

//FOR USER REGISTRATION

app.post("/register", (req, res) => {
  var name = req.body.name;
  var password = req.body.password;

  // Hash the password with bcrypt
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      throw err;
    }

    var data = {
      "name": name,
      "password": hash,
    }

    // Insert the user data into the database
    db.collection('users').insertOne(data, (err, collection) => {
      if (err) {
        throw err;
      }
      console.log("Record inserted successfully");
    });

    // Serve the login page
    res.sendFile(path.join(__dirname + '/public/index.html'));
  });
});

//adding notes to Database
app.post('/notes', (req, res) => {
  const { title, text } = req.body;
  const note = {
    title,
    text,
    created_at: new Date() // get date and time of instance
  };
  db.collection('notes').insertOne(note, (err, result) => {
    if (err) {
      return console.log(err);
    }
    console.log('Note created successfully');
    res.redirect('devices');
  });
});


app.get('/devices', async (req, res) => {
  try {
    const devices = await db.collection('notes').find().toArray();
    devices.forEach(device => {
      device.created_at = moment(device.created_at).format('MMM DD, YYYY hh:mm A');
    });
    res.render('devices', { devices });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/devices/:id', (req, res) => {
  const id = req.params.id;
  MyModel.findById(id)
    .then((device) => {
      if (!device) {
        return res.status(404).send(`No device found with id ${id}`);
      }
      res.render('devices', { device });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Server error');
    });
});

const getDeviceById = (id) => {
  return MyModel.findById(id)
    .then((device) => {
      if (!device) {
        throw new Error(`No device found with id ${id}`);
      }
      return device;
    })
    .catch((err) => {
      console.log(err);
      throw new Error('Server error');
    });
};

// Render the update form
app.get('/notes/:id/update', async (req, res) => {
  try {
    const device = await MyModel.findById(req.params.id)
    res.render('update', { device });
  } catch (err) {
    console.log(err)
    res.send('Error')
  }
})

// Update a note
// Update a note
app.post('/notes/:id', async (req, res) => {
  try {
    const { title, content } = req.body
    const device = await MyModel.findById(req.params.id)
    device.title = title
    device.text = content // change this from device.content to device.text
    await device.save()
    res.redirect('/notes')
  } catch (err) {
    console.log(err)
    res.send('Error')
  }
})

app.put('/notes/:id', async (req, res) => {
  const { title, content } = req.body;
  const { id } = req.params;

  try {
    const device = await MyModel.findById(id);
    if (!device) {
      return res.status(404).send('Note not found');
    }

    if (!content) {
      return res.status(400).send('Text field is required');
    }

    device.title = title;
    device.text = content; // change this from device.content to device.text
    await device.save();

    res.redirect('/devices');
  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});


app.get('/notes/:noteId', (req, res) => {
  const noteId = req.params.noteId;
  console.log(noteId);
  db.collection('notes')
    .findOne({ _id: new ObjectId(noteId) })
    .then((note) => {
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      const { title, text } = note;
      const content = `Title: ${title}\n\n${text}`;
      // Generate a unique filename
      const filename = `note_${noteId}.txt`;
      // Write the file to the server's filesystem
      fs.writeFile(filename, content, (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        // Send the file as a response
        res.download(filename, (err) => {
          if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          // Remove the file from the server's filesystem
          fs.unlink(filename, (err) => {
            if (err) {
              console.log(err);
            }
          });
        });
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: 'Internal server error' });
    });
});




// DELETE route for deleting a note
app.delete('/notes/:id', (req, res) => {
  const id = req.params.id;
  console.log('id:', id);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send('Invalid id parameter');
  }
  MyModel.findByIdAndDelete(id)
    .then((deletedNote) => {
      if (!deletedNote) {
        return res.status(404).send(`No note found with id ${id}`);
      }
      return res.status(200).send('Post deleted successfully');
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Server error');
    });
});

app.get('/update', (req, res) => {
  res.render('update');
});

// server.js
app.get('/update/:id', (req, res) => {
  const id = req.params.id;
  // Retrieve the data for the device with the specified ID
  const device = getDeviceById(id);
  // Render the update page with the device data pre-filled in the form
  res.render('update', { device });
});


app.listen(4001, '0.0.0.0', () => {
  console.log('Server is listening on port 4001');
});

app.get("/", (req, res) => {
  res.set({
    "Allow-access-Allow-Origin": '*'
  })
  return res.redirect('login.html')
}).listen(4000);

console.log("listening on PORT 4000");