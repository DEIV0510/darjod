// Datos del negocio. Solo lo que entregó el cliente: nada de dirección exacta, NIT,
// reseñas, precios ni promociones.
export const MARCA = 'DARJOD PARFUMS';
export const LEMA = 'El arte de dejar huella';

export const WHATSAPP = {
  visible: '313 559 5702',
  internacional: '573135595702',
  conIndicativo: '+57 313 559 5702',
};

export const UBICACION = {
  ciudad: 'Calarcá',
  departamento: 'Quindío',
  pais: 'Colombia',
  // Coordenadas del municipio (no de un local): solo como dato editorial.
  coordenadas: '4°31′ N · 75°38′ O',
  // Búsqueda del municipio en Google Maps, sin dirección exacta.
  mapa: 'https://www.google.com/maps/search/?api=1&query=Calarc%C3%A1%2C%20Quind%C3%ADo%2C%20Colombia',
};

export const HORARIO = 'Atención 24 horas';

// Redes que aparecen en las capturas que envió el cliente.
export const REDES = [
  { nombre: 'Instagram', usuario: '@darjodparfums', url: 'https://www.instagram.com/darjodparfums/' },
  { nombre: 'TikTok', usuario: '@darjod.parfums', url: 'https://www.tiktok.com/@darjod.parfums' },
];

export const DESCRIPCION =
  'Perfumería en Calarcá, Quindío: más de 500 fragancias árabes, de diseñador y nicho para dama, caballero y unisex. Atención 24 horas y compra por WhatsApp.';

/** Enlace a WhatsApp con el mensaje ya escrito. */
export function wa(mensaje: string): string {
  return `https://wa.me/${WHATSAPP.internacional}?text=${encodeURIComponent(mensaje)}`;
}

export const MENSAJES = {
  general: `Hola, ${MARCA}. Quiero comprar un perfume. ¿Me pueden asesorar?`,
  comprarAhora: `Hola, ${MARCA}. Quiero encontrar mi próxima fragancia. ¿Me ayudan a elegir?`,
  ubicacion: `Hola, ${MARCA}. Estoy en el Quindío y quiero comprar un perfume. ¿Cómo hago el pedido?`,
};
