import React from 'react';
import Link from 'next/link';

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#070b19] flex items-center justify-center p-4 relative overflow-hidden select-none font-sans text-[#dae2fd]">
      {/* Decorative background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#38bdf8]/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#1e293b]/25 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-3xl relative z-10 bg-[#171f33] border border-[#3e484f]/40 rounded-2xl shadow-2xl p-5 sm:p-8 space-y-6 animate-in fade-in duration-300">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-2xl shadow-xl mb-4">
            <span className="text-2xl font-black text-[#38bdf8] tracking-widest font-mono flex items-center gap-1">
              EDU<span className="text-[#dae2fd]">KYNE</span>
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#8ed5ff] uppercase tracking-wider">
            Política de Privacidade e Proteção de Dados
          </h1>
          <p className="text-[11px] text-[#bdc8d1]/80 mt-2">
            Conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
          </p>
        </div>

        {/* Seções */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">1. Dados Coletados</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">
            Coletamos apenas os dados estritamente necessários para o funcionamento do sistema,
            incluindo: nome, e-mail corporativo, CPF, data de nascimento, telefone, dados de
            responsáveis legais, informações de matrícula e dados de saúde (avaliações físicas
            e IMC) para fins pedagógicos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">2. Finalidade do Tratamento</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">
            Os dados são utilizados exclusivamente para: acompanhamento pedagógico e de desempenho
            escolar, controle de presença, avaliações físicas e vocacionais, gestão administrativa,
            e cumprimento de obrigações legais e regulamentares.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">3. Base Legal</h2>
          <ul className="text-xs text-[#bdc8d1]/90 space-y-1 list-disc pl-4 leading-relaxed">
            <li><strong>Consentimento (Art. 7º, I)</strong> — para dados pessoais gerais</li>
            <li><strong>Consentimento específico para dados de saúde (Art. 11)</strong> — avalições físicas</li>
            <li><strong>Responsável legal (Art. 14)</strong> — para dados de menores de idade</li>
            <li><strong>Obrigação legal (Art. 7º, II)</strong> — quando exigido por lei</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">4. Compartilhamento de Dados</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">
            Os dados não são compartilhados com terceiros sem consentimento expresso, exceto
            quando exigido por lei ou por determinação judicial. Utilizamos apenas o serviço
            de hospedagem (Supabase) que segue padrões internacionais de segurança.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">5. Segurança dos Dados</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">
            Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo:
            criptografia de transmissão (SSL/TLS), criptografia de dados sensíveis em repouso,
            hashing de senhas com bcrypt, controle de acesso baseado em papéis (RBAC) e registros
            de acesso (logs de auditoria).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">6. Retenção dos Dados</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">
            Os dados são mantidos enquanto durar a relação escolar/contratual. Ao término,
            os dados são eliminados ou anonimizados, salvo quando a retenção for necessária
            para cumprimento de obrigação legal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">7. Direitos do Titular (Art. 18 LGPD)</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">Você tem direito a:</p>
          <ul className="text-xs text-[#bdc8d1]/90 space-y-1 list-disc pl-4 leading-relaxed">
            <li>Confirmar a existência de tratamento dos seus dados</li>
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
            <li>Anonimizar, bloquear ou eliminar dados desnecessários</li>
            <li>Portabilidade dos dados</li>
            <li>Eliminação dos dados tratados com consentimento</li>
            <li>Revogação do consentimento</li>
            <li>Informação sobre compartilhamento de dados</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">8. Encarregado de Proteção de Dados (DPO)</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">
            Para exercer seus direitos ou esclarecer dúvidas, entre em contato com nosso
            Encarregado de Proteção de Dados:
          </p>
          <div className="bg-[#0b1326] border border-[#3e484f]/40 rounded-lg p-4 mt-2 space-y-1">
            <p className="text-xs text-[#8ed5ff]"><strong>E-mail:</strong> lgpd@edukyne.com.br</p>
            <p className="text-xs text-[#bdc8d1]/80"><strong>Endereço:</strong> EDUKYNE — Departamento de Privacidade</p>
          </div>
        </section>

        <div className="border-t border-[#3e484f]/40 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-xs bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg px-5 py-2.5 inline-flex items-center gap-2 transition-all">
            ← Voltar ao Sistema
          </Link>
          <p className="text-[10px] text-[#87929a]">
            © 2026 EDUKYNE — Política atualizada em 02/09/2026
          </p>
        </div>
      </div>
    </div>
  );
}
