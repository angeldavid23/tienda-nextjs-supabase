import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { numeroGestion, nombre, total, telefono, resumen } = body;

  const PHONE_ID = process.env.NEXT_PUBLIC_WA_PHONE_ID;
  const TOKEN = process.env.NEXT_PUBLIC_WA_TOKEN;
  const url = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;

  // Limpieza del número del cliente
  let numeroCliente = telefono.replace(/\D/g, '');
  if (!numeroCliente.startsWith('502')) numeroCliente = `502${numeroCliente}`;

  // Configuración del número del vendedor (Asegúrate de que sea el tuyo)
  const numeroVendedor = "50234826391"; 

  // 1. Payload para el CLIENTE (confirmacion_orden)
  const payloadCliente = {
    messaging_product: "whatsapp",
    to: numeroCliente,
    type: "template",
    template: {
      name: "confirmacion_orden",
      language: { code: "es" },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: nombre },
          { type: "text", text: numeroGestion },
          { type: "text", text: `Q${total.toFixed(2)}` }
        ]
      }]
    }
  };

  // 2. Payload para el VENDEDOR (nueva_venta_aura)
  // 2. Payload para el VENDEDOR (nueva_venta_aura)
  const payloadVendedor = {
    messaging_product: "whatsapp",
    to: numeroVendedor,
    type: "template",
    template: {
      name: "nueva_venta_aura",
      // Cambio CLAVE: de 'es' a 'es_MX'
      language: { code: "es_MX" }, 
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: numeroGestion }, // {{1}}
          { type: "text", text: nombre },        // {{2}}
          { type: "text", text: resumen },       // {{3}}
          { type: "text", text: `Q${total.toFixed(2)}` }, // {{4}}
          { type: "text", text: numeroCliente }  // {{5}}
        ]
      }]
    }
  };
  try {
    const [resCliente, resVendedor] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadCliente),
      }),
      fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadVendedor),
      })
    ]);

    const dataCliente = await resCliente.json();
    const dataVendedor = await resVendedor.json();

    // --- DEBUG: Revisa tu terminal de VS Code después de intentar una compra ---
    console.log("Respuesta Meta (Cliente):", dataCliente);
    console.log("Respuesta Meta (Vendedor):", dataVendedor);

    // Si Meta devuelve error, lo veremos aquí:
    if (dataVendedor.error) {
      console.error("DETALLE ERROR VENDEDOR:", dataVendedor.error.message);
    }

    return NextResponse.json({
      cliente: dataCliente,
      vendedor: dataVendedor
    }, { status: 200 });

  } catch (error) {
    console.error("Error en el servidor de WhatsApp:", error);
    return NextResponse.json({ error: 'Error al enviar notificaciones' }, { status: 500 });
  }
}