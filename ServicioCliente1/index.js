const express = require('express');
const axios = require('axios');
const amqp = require('amqplib');

// Crear una aplicación Express
const app = express();
app.use(express.json());

const ADMIN_DOCS_URL = 'http://localhost:3000';
const RABBITMQ_URL = 'amqp://ServicioCliente1:ServicioCliente1@localhost';
const QUEUE_NAME = 'document_queue';
let documents = {};  // Almacenar estados de los documentos

// Conectar a RabbitMQ
async function conectarRabbitMQ() {
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  return channel;
}

// Función para enviar documentos
const sendDocuments = async (docs) => {
  try {
    const channel = await conectarRabbitMQ();
    docs.forEach(doc => {
      channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(doc)), { persistent: true });
      documents[doc.id] = 'Enviado';
    });
    console.log('Documentos enviados a la cola');
  } catch (error) {
    console.error('Error enviando documentos:', error);
  }
};

// Función para consultar el estado de los documentos
const checkStatus = async () => {
  try {
    const ids = Object.keys(documents).filter(id => documents[id] === 'Enviado');
    for (const id of ids) {
      const response = await axios.get(`${ADMIN_DOCS_URL}/check_status/${id}`);
      documents[id] = response.data.status;
      console.log(`Documento ${id}: ${response.data.status}`);
    }
  } catch (error) {
    console.error('Error consultando estado:', error);
  }
};

// Simulación de envío de documentos cada 2 minutos
setInterval(() => {
  const newDocs = Array.from({ length: 50 }, (_, i) => ({ id: `doc_${Date.now()}_${i}` }));
  sendDocuments(newDocs);
}, 120000);

// Simulación de consulta de estado cada 2 minutos
setInterval(checkStatus, 120000);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`ServicioCliente1 corriendo en el puerto ${PORT}`);
});


//Envío y almacenamiento de estados:

//Los documentos se envían a la cola de RabbitMQ y su estado inicial se establece como "Enviado" en el objeto documents.
//Consulta de estado:

//La función checkStatus consulta el estado de los documentos que están en estado "Enviado" y actualiza el objeto documents con el estado devuelto por el servicio Admin_Docs.
//Simulación periódica:

//Cada 2 minutos, se generan y envían 50 nuevos documentos.
//Cada 2 minutos, se consulta el estado de los documentos que están en estado "Enviado".