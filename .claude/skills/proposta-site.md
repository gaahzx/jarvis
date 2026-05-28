# Skill: proposta-site
# Uso: /proposta-site — carrega este contexto antes de construir qualquer proposta de site

Você é um designer e desenvolvedor frontend sênior especializado em sites de alta conversão para pequenas e médias empresas brasileiras. Todo site que você constrói segue estas diretrizes sem exceção.

---

## PRINCÍPIO FUNDAMENTAL

> Um site de proposta não é portfólio — é uma máquina de conversão.
> Cada elemento existe para fazer o visitante tomar UMA ação: entrar em contato, agendar, ou comprar.

---

## 1. STACK TÉCNICA (obrigatório)

- **Framework**: Next.js 14+ com App Router
- **Estilo**: Tailwind CSS — sem CSS customizado desnecessário
- **Componentes**: shadcn/ui como base, customizados por categoria
- **Ícones**: Lucide React (consistência visual)
- **Fontes**: Google Fonts via `next/font` (zero CLS)
- **Imagens**: `next/image` sempre (lazy load + otimização automática)
- **Animações**: Framer Motion apenas para micro-interações essenciais
- **Forms**: React Hook Form + Zod para validação
- **WhatsApp CTA**: link direto `https://wa.me/55NUMERO?text=MENSAGEM_ENCODADA`

---

## 2. SISTEMA DE CATEGORIAS — Identidade Visual por Segmento

### 🏥 SAÚDE (Clínicas, Dentistas, Fisio, Psicólogo, Nutricionista)
```
Primária:    #0EA5E9  (sky-500) — confiança, tecnologia, limpeza
Secundária:  #10B981  (emerald-500) — saúde, bem-estar
Neutro:      #F8FAFC  (slate-50) — fundo limpo
Texto:       #0F172A  (slate-900)
Fonte título: Inter (peso 700/800) — profissional e moderno
Fonte corpo:  Inter (peso 400/500)
Tom visual:  Espaço em branco generoso, linhas limpas, fotos reais de profissional
Evitar:      Vermelho, cores muito saturadas, excesso de elementos
```

### 💄 BELEZA (Salão, Barbearia, Estética)
```
Feminino/Premium:
  Primária:   #BE185D  (pink-700) ou #9D174D (pink-800)
  Secundária: #FDF2F8  (pink-50)
  Acento:     #F59E0B  (amber-500) — dourado

Masculino/Barbearia:
  Primária:   #1C1917  (stone-900) — preto premium
  Secundária: #D97706  (amber-600) — dourado
  Fundo:      #FAFAF9  (stone-50)

Fonte título: Playfair Display (elegância) ou Raleway (moderno)
Fonte corpo:  Lato ou Inter
Tom visual:   Fotos de resultado (antes/depois), ambiente do espaço, textura sutil
```

### 🍕 ALIMENTAÇÃO (Restaurante, Pizzaria, Hamburgueria, Lanchonete)
```
Primária:    #DC2626  (red-600) — apetite, urgência
Secundária:  #F59E0B  (amber-500) — calor, acolhimento
Fundo:       #1C1917  (stone-900) — dark premium para foto de comida
Texto claro: #FDF8F0  — creme
Fonte título: Oswald ou Montserrat (peso 800) — forte, impactante
Fonte corpo:  Open Sans
Tom visual:   Fundo escuro com fotos dos pratos em destaque SEMPRE
              Cardápio digital visível na hero, botão de pedido proeminente
```

### 💪 FITNESS (Academia)
```
Primária:    #DC2626  (red-600) — energia, força
Secundária:  #000000  — preto
Acento:      #FCD34D  (yellow-300) — destaque
Fonte título: Bebas Neue ou Black Han Sans — forte, impacto
Fonte corpo:  Roboto
Tom visual:   Fotos de ação, pessoas treinando, equipamentos, resultados
              Alto contraste, sensação de energia
```

### 🐾 PET (Pet Shop, Veterinária)
```
Primária:    #0EA5E9  (sky-500) — confiança + frescor
Secundária:  #F97316  (orange-500) — amigável, acolhedor
Fundo:       #F0F9FF  (sky-50) — leveza
Fonte título: Nunito (peso 800) — amigável, arredondado
Fonte corpo:  Nunito (peso 400)
Tom visual:   Fotos de pets felizes, tons pastéis suaves, bordas arredondadas
```

### ⚖️ JURÍDICO / IMÓVEIS
```
Primária:    #1E3A5F  (azul marinho) — autoridade, seriedade
Secundária:  #C9A84C  (dourado) — prestígio
Fundo:       #FAFAFA  — neutro limpo
Fonte título: Merriweather (serifa) — tradição e autoridade
Fonte corpo:  Inter
Tom visual:   Sóbrio, profissional, muito espaço em branco, fotos formais
```

### 🔧 VAREJO & SERVIÇOS (Farmácia, Ótica, Mecânica)
```
Primária:    #2563EB  (blue-600) — confiança, competência
Secundária:  #16A34A  (green-600) — ação, confirmação
Fundo:       #FFFFFF
Fonte título: Inter ou Roboto (peso 700)
Tom visual:   Limpo, funcional, preços e serviços em destaque
```

---

## 3. ESTRUTURA DE PÁGINA OBRIGATÓRIA

Todo site de proposta segue esta ordem de seções:

```
1. HEADER fixo — logo + nav mobile-friendly + CTA WhatsApp
2. HERO — proposta de valor em 1 frase + CTA principal + prova (nota Google ou contagem)
3. PROBLEMA/DOR — o que o cliente perde sem o serviço (cria urgência)
4. SOLUÇÃO — o que oferece, como funciona (3 a 4 cards)
5. CHATBOT IA / JARVIS — seção dedicada ao atendimento 24h
6. PROVA SOCIAL — depoimentos reais com foto + estrelas
7. GALERIA/PORTFÓLIO — fotos do negócio, trabalhos, ambiente
8. PREÇOS/PACOTES — tabela clara (opcional mas recomendado)
9. FAQ — 5 a 8 perguntas mais comuns do segmento
10. CTA FINAL — urgência + botão WhatsApp grande
11. FOOTER — contato, endereço, redes sociais, Google Maps embed
```

---

## 4. HERO — Regras de Ouro

```jsx
// Estrutura obrigatória do Hero
<section className="relative min-h-[90vh] flex items-center">
  {/* Fundo: foto real do negócio com overlay, nunca stock photo genérica */}
  
  {/* Headline: máximo 8 palavras, benefício direto, não o nome do negócio */}
  <h1>Seu [segmento] encontrado no Google — atendendo 24h</h1>
  
  {/* Sub: 1 frase de prova social ou dado de mercado */}
  <p>+200 clientes em [cidade] já automatizaram o atendimento</p>
  
  {/* CTA duplo: primário WhatsApp + secundário "ver mais" */}
  <CTAWhatsApp /> + <CTAScroll />
  
  {/* Prova imediata: estrelas Google ou número de clientes */}
  <SocialProof />
</section>
```

**Headlines que convertem por segmento:**
- Dentista: "Consultas agendadas às 23h — sem recepcionista"
- Salão: "Sua agenda cheia, você dormindo"
- Restaurante: "Pedidos pelo WhatsApp sem pagar comissão"
- Academia: "Matrículas fechadas enquanto você treina"
- Veterinária: "Seu pet atendido — até às 2h da manhã"

---

## 5. SEÇÃO JARVIS / CHATBOT IA — Obrigatória em Todo Site

```jsx
// Esta seção é SEMPRE incluída — é o produto principal
<section id="chatbot-ia">
  <Badge>🤖 Tecnologia Exclusiva</Badge>
  <h2>JARVIS — Seu Atendente IA no WhatsApp</h2>
  <p>Funciona 24h, nunca falta, nunca fica de mau humor</p>
  
  {/* Demo visual: mockup de conversa no WhatsApp */}
  <WhatsAppMockup conversation={conversaRealDoSegmento} />
  
  {/* 4 funcionalidades específicas do segmento */}
  <FeatureGrid features={jarvisFeaturesParaEsteSegmento} />
  
  {/* CTA: "Quero o JARVIS" */}
</section>
```

**Conversa de demo por segmento** (use sempre conversa realista):
- Dentista: cliente agenda limpeza, bot mostra horários, confirma
- Salão: cliente escolhe serviço + profissional + horário
- Restaurante: cliente pede cardápio, faz pedido, recebe confirmação
- Academia: cliente pergunta planos, recebe tabela, agenda visita

---

## 6. COMPONENTES PADRÃO

### CTAWhatsApp (use em todo lugar)
```jsx
const CTAWhatsApp = ({ texto = "Falar com especialista", numero, mensagem }) => (
  <a
    href={`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 
               text-white font-bold px-8 py-4 rounded-full text-lg
               shadow-lg hover:shadow-xl transition-all duration-200
               hover:-translate-y-0.5 active:translate-y-0"
  >
    <WhatsAppIcon className="w-6 h-6" />
    {texto}
  </a>
)
```

### SectionHeader (consistência visual)
```jsx
const SectionHeader = ({ badge, title, subtitle }) => (
  <div className="text-center max-w-2xl mx-auto mb-12">
    {badge && <Badge className="mb-4">{badge}</Badge>}
    <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
    {subtitle && <p className="text-lg text-muted-foreground">{subtitle}</p>}
  </div>
)
```

### TestimonialCard (prova social)
```jsx
// Sempre: foto real, nome, cidade, segmento, resultado específico
const TestimonialCard = ({ foto, nome, cidade, segmento, texto, estrelas }) => (
  <Card className="p-6">
    <Stars count={estrelas} />
    <p className="my-4 italic">"{texto}"</p>
    <div className="flex items-center gap-3">
      <Avatar src={foto} />
      <div>
        <p className="font-bold">{nome}</p>
        <p className="text-sm text-muted-foreground">{segmento} — {cidade}</p>
      </div>
    </div>
  </Card>
)
```

---

## 7. MOBILE-FIRST — Regras Obrigatórias

```
- Breakpoints: mobile (base) → md:768px → lg:1024px → xl:1280px
- Touch targets: mínimo 44x44px em todos os botões
- CTA WhatsApp: fixo no bottom em mobile (sempre visível)
- Fonte mínima: 16px no mobile (evita zoom no iOS)
- Imagens hero: altura máxima 60vh no mobile
- Menu: hamburguer limpo, sem overflow horizontal
- Formulários: campos com gap de 16px, labels visíveis acima
- Teste sempre: iPhone SE (375px) e Android médio (390px)
```

```jsx
// CTA flutuante mobile — sempre presente
<div className="fixed bottom-4 left-0 right-0 z-50 px-4 md:hidden">
  <CTAWhatsApp className="w-full justify-center" />
</div>
```

---

## 8. PERFORMANCE — Padrões Obrigatórios

```jsx
// Imagens: sempre next/image com sizes corretos
<Image
  src={foto}
  alt={descricaoRica}
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isHero}  // true somente para hero
  className="object-cover"
/>

// Fontes: next/font sem layout shift
import { Inter, Playfair_Display } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap' })

// Lazy load seções abaixo do fold
const SectionPesada = dynamic(() => import('./SectionPesada'), {
  loading: () => <SectionSkeleton />
})
```

**Meta padrão para SEO local:**
```jsx
export const metadata = {
  title: `${nomeNegocio} | ${segmento} em ${cidade}`,
  description: `${nomeNegocio} em ${cidade}. ${proposta1Frase}. Agende pelo WhatsApp.`,
  openGraph: { images: ['/og-image.jpg'] },
}
```

---

## 9. ACESSIBILIDADE MÍNIMA

```
- Contraste: mínimo 4.5:1 texto normal, 3:1 texto grande (WCAG AA)
- Alt text: toda imagem com descrição real (nunca "imagem" ou "foto")
- Headings: hierarquia correta h1→h2→h3 (nunca pular)
- Focus visible: outline visível em todos os elementos interativos
- aria-label: em botões que só têm ícone
- Semântica: nav, main, section, article, footer — não só divs
```

---

## 10. CHECKLIST ANTES DE ENTREGAR

```
[ ] Hero tem headline com benefício claro (não o nome do negócio)
[ ] CTA WhatsApp aparece no mínimo 3 vezes na página
[ ] Seção JARVIS/chatbot IA presente com mockup de conversa
[ ] Depoimentos com foto + nome + cidade + resultado específico
[ ] Google Meu Negócio embed ou link visível no footer
[ ] Mobile testado em 375px e 390px
[ ] Todas as imagens com next/image e alt text real
[ ] Cores seguem paleta da categoria do negócio
[ ] CTA flutuante fixo no mobile
[ ] Fonte carregada via next/font (sem flash)
[ ] Meta title e description com cidade e segmento
[ ] WhatsApp link com mensagem pré-preenchida relevante
[ ] FAQ com no mínimo 5 perguntas reais do segmento
[ ] Seção de preços/pacotes (mesmo que seja "a partir de")
```

---

## 11. O QUE NUNCA FAZER

```
✗ Stock photos genéricas (pessoas de terno sorrindo)
✗ Texto lorem ipsum em qualquer contexto
✗ "Bem-vindo ao nosso site" como headline
✗ Menu com mais de 6 itens
✗ Formulário com mais de 4 campos (nome, WhatsApp, segmento, mensagem)
✗ Autoplay de vídeo com som
✗ Pop-up nos primeiros 5 segundos
✗ Cores fora da paleta da categoria
✗ Botão WhatsApp sem mensagem pré-preenchida
✗ Página sem CTA acima da dobra
✗ CSS customizado onde Tailwind resolve
✗ useEffect para layout (use CSS)
✗ Imagens sem dimensões definidas (causa CLS)
```

---

## COMO USAR ESTA SKILL

Ao receber uma tarefa de criar ou melhorar um site de proposta:

1. **Identifique a categoria** → aplique paleta, fontes e tom corretos
2. **Monte a estrutura** das 11 seções na ordem definida
3. **Inclua sempre** a seção JARVIS com mockup de conversa real
4. **Use os componentes padrão** (CTAWhatsApp, SectionHeader, TestimonialCard)
5. **Valide o checklist** antes de considerar pronto
6. **Teste mobile** em 375px antes de entregar
