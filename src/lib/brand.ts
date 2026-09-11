export const PRODUCT_NAME = "Eje Uno";
export const PRODUCT_TAGLINE = "El eje operativo de tu negocio";
export const PRODUCT_DOMAIN = "ejeuno.onrender.com";

/** Voz femenina para la recepcionista que atiende clientes. */
export const CLIENT_VOICE = "nova";
/** Voz masculina para el asistente interno del dueño. */
export const OWNER_VOICE = "onyx";

export type AgentProfile = {
  name: string;
  title: string;
  voice: string;
  gender: "female" | "male";
};

export type BusinessAgents = {
  client: AgentProfile;
  owner: AgentProfile;
};

const AGENTS: Record<string, { client: string; owner: string }> = {
  BARBERSHOP: { client: "Sofía", owner: "Mateo" },
  CLINIC: { client: "Laura", owner: "Andrés" },
  VET: { client: "Daniela", owner: "Nicolás" },
  HOTEL: { client: "Isabella", owner: "Martín" },
  RESTAURANT: { client: "Valentina", owner: "Diego" },
  WORKSHOP: { client: "Camila", owner: "Rafael" },
  GENERIC: { client: "Sofía", owner: "Martín" },
};

export function agentsFor(vertical?: string | null, businessName?: string): BusinessAgents {
  const key = String(vertical || "GENERIC");
  const names = AGENTS[key] || AGENTS.GENERIC;
  const biz = businessName?.trim() || "el negocio";
  return {
    client: {
      name: names.client,
      title: `Recepcionista de ${biz}`,
      voice: CLIENT_VOICE,
      gender: "female",
    },
    owner: {
      name: names.owner,
      title: `Asistente operativo de ${biz}`,
      voice: OWNER_VOICE,
      gender: "male",
    },
  };
}

export function clientAgentName(vertical?: string | null, businessName?: string) {
  return agentsFor(vertical, businessName).client.name;
}

export function ownerAgentName(vertical?: string | null, businessName?: string) {
  return agentsFor(vertical, businessName).owner.name;
}
