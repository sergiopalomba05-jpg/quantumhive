'use client'

import { use } from 'react'
import ProductoForm from '@/components/ProductoForm'

export default function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Editar Producto</h1>
      <ProductoForm modo="editar" productoId={id} />
    </div>
  )
}
