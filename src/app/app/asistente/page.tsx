import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { OwnerAssistantChat } from "@/components/owner-assistant-chat";
import { agentsFor } from "@/lib/brand";

export default async function OwnerAssistantPage() {
  const session = await requireOwner();
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId } });
  const agents = agentsFor(tenant.vertical, tenant.name);

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 h-[calc(100dvh-3.5rem)] lg:h-dvh">
      <OwnerAssistantChat
        tenantName={tenant.name}
        ownerName={session.name}
        agentName={agents.owner.name}
        clientName={agents.client.name}
      />
    </div>
  );
}
