import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { PageHeader } from "@/components/nav";
import { OwnerAssistantChat } from "@/components/owner-assistant-chat";
import { agentsFor } from "@/lib/brand";

export default async function OwnerAssistantPage() {
  const session = await requireOwner();
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId } });
  const agents = agentsFor(tenant.vertical, tenant.name);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        kicker={tenant.name}
        title={agents.owner.name}
        hint={`${agents.owner.title}. Voz de hombre. ${agents.client.name} sigue atendiendo a tus clientes.`}
      />
      <OwnerAssistantChat
        tenantName={tenant.name}
        ownerName={session.name}
        agentName={agents.owner.name}
        clientName={agents.client.name}
      />
    </div>
  );
}
