import { requireSuperadmin } from "@/lib/guards";
import { CopyField } from "@/components/copy-field";
import { TelegramActivateButton } from "@/components/telegram-activate-button";
import { telegramReady } from "@/lib/telegram";
import { whatsappTrace } from "@/lib/whatsapp-trace";

export default async function TelegramPage() {
  await requireSuperadmin();
  const ready = telegramReady();

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">Telegram</h1>
        <p className="text-slate-300 mt-2 text-lg">
          Esta es la vía fácil. No usa Facebook ni el SMS de Twilio. En 10 minutos Sofía habla por Telegram.
        </p>
      </header>

      <div className="card space-y-2">
        <p className="font-semibold">Último mensaje</p>
        <p className="text-slate-300">{whatsappTrace.lastHint}</p>
        {whatsappTrace.lastText ? (
          <p className="text-sm text-slate-400">
            “{whatsappTrace.lastText}” → “{whatsappTrace.lastReply.slice(0, 160)}”
          </p>
        ) : null}
      </div>

      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">1. Crear el bot</h2>
        <ol className="list-decimal pl-6 space-y-2 text-slate-200">
          <li>En el celular abre Telegram.</li>
          <li>
            Busca <b>@BotFather</b> y mándale <b>/newbot</b>.
          </li>
          <li>Ponle nombre (ej. Sofía Eje Uno) y un usuario que termine en bot (ej. ejeuno_sofia_bot).</li>
          <li>BotFather te da un token largo. Cópialo. No lo pegues en el chat de Cursor.</li>
        </ol>
      </section>

      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">2. Pegarlo en Render</h2>
        <p>Render → ejeuno → Environment → Add:</p>
        <CopyField value="TELEGRAM_BOT_TOKEN" />
        <p>Value: el token de BotFather. Save Changes. Espera el deploy.</p>
        <p className={ready ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
          {ready ? "Bien: el token ya está en el servidor." : "Todavía falta el token en Render."}
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">3. Activar y probar</h2>
        <p>Cuando Render termine, pulsa:</p>
        <TelegramActivateButton />
        <p>Luego en Telegram abre tu bot y escribe: Hola.</p>
      </section>
    </div>
  );
}
