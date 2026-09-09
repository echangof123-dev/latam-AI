export const MODULE_CATALOG = [
  { key: "agenda", name: "Agenda", description: "Reservas, reprogramación y cancelación" },
  { key: "clientes", name: "Clientes", description: "Ficha y historial por negocio" },
  { key: "servicios", name: "Servicios y precios", description: "Catálogo independiente por tenant" },
  { key: "personal", name: "Personal", description: "Equipo y roles de atención" },
  { key: "sucursales", name: "Sucursales", description: "Sedes, horarios y políticas locales" },
  { key: "ia", name: "Atención IA", description: "Voz y texto autónomos por número" },
  { key: "inventario", name: "Inventario", description: "Stock separado por negocio" },
  { key: "facturacion", name: "Facturación", description: "Cuentas y cobros" },
  { key: "ventas", name: "Ventas", description: "Ingresos y tickets" },
  { key: "reportes", name: "Reportes", description: "Rendimiento operativo y de la IA" },
] as const;

export type ModuleKey = (typeof MODULE_CATALOG)[number]["key"];

export const VERTICAL_PRESETS: Record<string, ModuleKey[]> = {
  GENERIC: ["agenda", "clientes", "servicios", "personal", "sucursales", "ia", "reportes"],
  BARBERSHOP: ["agenda", "clientes", "servicios", "personal", "sucursales", "ia", "ventas", "reportes"],
  CLINIC: ["agenda", "clientes", "servicios", "personal", "sucursales", "ia", "inventario", "facturacion", "reportes"],
  VET: ["agenda", "clientes", "servicios", "personal", "sucursales", "ia", "inventario", "reportes"],
  HOTEL: ["agenda", "clientes", "servicios", "personal", "sucursales", "ia", "facturacion", "reportes"],
  RESTAURANT: ["agenda", "clientes", "servicios", "personal", "sucursales", "ia", "inventario", "ventas", "reportes"],
  WORKSHOP: ["agenda", "clientes", "servicios", "personal", "sucursales", "ia", "inventario", "facturacion", "reportes"],
};

export const VERTICAL_LABEL: Record<string, string> = {
  GENERIC: "General",
  CLINIC: "Clínica",
  VET: "Veterinaria",
  BARBERSHOP: "Barbería",
  HOTEL: "Hotel",
  RESTAURANT: "Restaurante",
  WORKSHOP: "Taller",
};
