const express = require('express');
const amqp = require('amqplib/callback_api');

// Crear una aplicación Express
const app = express();
app.use(express.json());

const RABBITMQ_URL = 'amqp://Admin_Docs:Admin_Docs@localhost';
const QUEUE_NAME = 'document_queue';

let documents = {};  // Almacenar estados de los documentos

// Conectar a RabbitMQ
amqp.connect(RABBITMQ_URL, (error0, connection) => {
  if (error0) {
    throw error0;
  }
  connection.createChannel((error1, channel) => {
    if (error1) {
      throw error1;
    }
    channel.assertQueue(QUEUE_NAME, {
      durable: true
    });

    // Procesar documentos de la cola
    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        const doc = JSON.parse(msg.content.toString());
        const docId = doc.id;
        documents[docId] = 'En Proceso';
        
        console.log(`Documento ${docId} recibido y en proceso`);

        // Cambiar el estado después de 1 minuto
        setTimeout(() => {
          const newState = Math.random() > 0.5 ? 'Aceptado' : 'Rechazado';
          documents[docId] = newState;
          console.log(`Documento ${docId} actualizado a ${newState}`);
          
          // Enviar actualización de estado de nuevo a la cola
          channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify({ id: docId, state: newState })), { persistent: true });
          
          // Eliminar el mensaje de la cola
          channel.ack(msg);
        }, 60000);
      }
    }, {
      noAck: false
    });

    // Endpoint para recibir documentos
    app.post('/receive_documents', (req, res) => {
      const docs = req.body.documents;
      docs.forEach(doc => {
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(doc)), { persistent: true });
        documents[doc.id] = 'En Proceso'; // Inicialmente todos los documentos están en proceso
      });
      res.json({ message: 'los Documentos fueron recibidos y en proceso' });
    });

    // Endpoint para consultar el estado de los documentos
    app.get('/check_status/:id', (req, res) => {
      const docId = req.params.id;
      const status = documents[docId];
      if (status) {
        res.json({ id: docId, status: status });
      } else {
        res.status(404).json({ message: 'El Documento no fue encontrado' });
      }
    });

  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Admin_Docs corriendo en el puerto ${PORT}`);
});




//Envío y procesamiento de documentos:

//Los documentos recibidos a través del endpoint /receive_documents se envían a una cola de RabbitMQ.
//Se inicializa el estado de los documentos a "En Proceso" y se almacena en un objeto documents.
//Cambio de estado diferido:

//Los documentos de la cola se procesan y se establece un temporizador para cambiar su estado después de 1 minuto.
//El nuevo estado se decide aleatoriamente entre "Aceptado" y "Rechazado".
//Una vez cambiado el estado, se envía una actualización de estado de vuelta a la cola de RabbitMQ para que pueda ser procesada y reconocida.
//Consulta de estado:

//El endpoint /check_status/:id permite consultar el estado actual de un documento por su ID.
//Si el documento no se encuentra, se devuelve un mensaje de error 404.