import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Txt } from '@/components/ui/text';
import type { QuoteForm } from '@/features/landing/hooks/use-quote-form';
import { apiMode } from '@/features/requests/constants/request-mode';
import { useCommonStyles } from '@/theme/common.styles';

export function PrivacyDialog({ form }: { form: QuoteForm }) {
  const common = useCommonStyles();
  const { privacy, setPrivacy } = form;
  return (
    <Dialog
      open={privacy}
      onClose={() => setPrivacy(false)}
      size="compact"
      eyebrow="PRIVACIDADE"
      title="Seus dados, com propósito"
    >
      <Txt>
        Nome, e-mail, informações do projeto e documentos são usados para avaliar o pedido e
        responder sobre o orçamento.
      </Txt>
      <Txt style={common.caption}>
        {apiMode
          ? 'A solicitação é armazenada no servidor e consultada pela equipe autorizada. Os documentos não são publicados no site nem anexados automaticamente ao e-mail de orçamento.'
          : 'Nesta prévia, os dados ficam apenas no armazenamento deste navegador. Use documentos fictícios. Você pode removê-los limpando os dados do site.'}
      </Txt>
      <Txt style={common.caption}>
        O consentimento não autoriza campanhas de marketing. Não inclua senhas ou informações que
        não sejam necessárias à tradução.
      </Txt>
      <Button variant="secondary" onPress={() => setPrivacy(false)}>
        Entendi
      </Button>
    </Dialog>
  );
}
