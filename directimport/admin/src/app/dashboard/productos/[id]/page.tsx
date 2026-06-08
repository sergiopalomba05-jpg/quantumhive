'use client'

import ProductoForm from '@/components/ProductoForm'

export default function EditarProductoPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Editar Producto</h1>
      <ProductoForm modo="editar" productoId={params.id} />
    </div>
  )
}
