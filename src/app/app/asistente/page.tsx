import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { PageHeader } from "@/components/nav";
import { OwnerAssistantChat } from "@/components/owner-assistant-chat";

export default async function OwnerAssistantPage() {
  const session = await requireOwner();
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId } });

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        kicker="CRM"
        title="Asistente del negocio"
        hint="Elena lee el CRM de este local y te lo cuenta en voz alta. Sofía sigue siendo la que habla con tus clientes."
      />
      <OwnerAssistantChat tenantName={tenant.name} ownerName={session.name} />
    </div>
  );
}
