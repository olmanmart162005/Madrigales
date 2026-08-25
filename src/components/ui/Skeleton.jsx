import React from 'react'

/**
 * Componente Skeleton base
 */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

/**
 * Skeleton para tarjeta de estadística del dashboard
 */
export function StatCardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

/**
 * Skeleton para fila de tabla
 */
export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * Skeleton para tabla completa
 */
export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </>
  )
}

/**
 * Skeleton para card de producto
 */
export function ProductCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Spinner de carga
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-4',
  }

  return (
    <div
      className={`${sizes[size]} border-primary-200 border-t-primary-600 rounded-full animate-spin ${className}`}
    />
  )
}

/**
 * Loading screen de página completa
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center space-y-4">
        <Spinner size="xl" className="mx-auto" />
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    </div>
  )
}
