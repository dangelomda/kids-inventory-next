// src/app/test/page.js
'use client';
import Test from '@/components/Test'; // Usando o mesmo tipo de atalho que está falhando

export default function TestPage() {
  return (
    <div>
      <h1>Página de Teste</h1>
      <Test />
    </div>
  );
}