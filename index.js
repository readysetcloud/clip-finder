import express from 'express';
import { Gopher } from './src/gophers.js';

const app = express();

app.listen(8000, () => { console.log('listening on port 8000') });

app.post('/gophers', async (req, res) => {
  try {
    const id = await Gopher.create(req.body);
    res.status(201).send({ id });

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Something went wrong' });
  }
});

app.get('/gophers/:id', async (req, res) => {
  try {
    const data = await Gopher.load(req.params.id);
    if (data) {
      res.status(200).send(data);
    } else {
      res.status(404).send({ message: 'Gopher not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Something went wrong' });
  }
});