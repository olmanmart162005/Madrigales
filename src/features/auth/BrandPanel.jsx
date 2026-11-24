import React from 'react'
import { ShoppingBag, Warehouse, Calendar, ShieldCheck } from 'lucide-react'
import Snowfall from '@/components/ui/Snowfall'

export default function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-10 overflow-hidden bg-gradient-to-br from-[#123A26] via-[#0C2418] to-[#081A11] border-r border-white/10 text-white">
      {/* Luces navideñas ambientales */}
      <div className="absolute -top-10 -right-10 w-80 h-80 bg-purple-600/25 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-400/10 rounded-full filter blur-[100px] pointer-events-none" />
      <Snowfall count={22} />

      {/* Encabezado Superior: Logo Oficial & Nombre */}
      <div className="relative z-10 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full bg-white p-0.5 border-2 border-gold-400/70 shadow-md flex items-center justify-center overflow-hidden">
          <img src="/LOGO_OFICIAL.png" alt="Nani Cake" className="w-full h-full object-contain" />
        </div>
        <div>
          <span className="font-script text-2xl font-bold text-white block leading-none">
            Nani Cake
          </span>
          <span className="text-[10px] font-bold tracking-[0.2em] text-gold-300 uppercase block mt-1">
            Pastelería &middot; Sistema POS
          </span>
        </div>
      </div>

      {/* Centro: Presentación con el Logo Oficial */}
      <div className="relative z-10 my-auto py-6 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-40 h-40 rounded-full bg-white border-4 border-gold-400/60 p-1 shadow-[0_0_40px_rgba(200,16,46,0.35)] flex items-center justify-center overflow-hidden">
            <img src="/LOGO_OFICIAL.png" alt="Nani Cake" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-script text-4xl font-bold text-white">Nani Cake</h3>
            <p className="text-[11px] font-bold tracking-[0.25em] text-purple-300 uppercase mt-1">
              Pastelería &amp; Repostería
            </p>
            <p className="text-xs text-pine-200/80 max-w-xs mt-2">
              Plataforma integral para la administración de pedidos, inventario y facturación.
            </p>
          </div>
        </div>

        {/* Módulos clave */}
        <div className="grid grid-cols-1 gap-2.5 max-w-sm mx-auto w-full pt-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-purple-500/25 text-purple-300 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Punto de Venta & Pedidos</p>
              <p className="text-[11px] text-pine-200/70">Emisión de facturas y control de saldos</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-pine-400/25 text-pine-200 flex items-center justify-center flex-shrink-0">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Almacén & Materias Primas</p>
              <p className="text-[11px] text-pine-200/70">Control de existencias y alertas de stock</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-gold-400/20 text-gold-300 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Calendario de Entregas</p>
              <p className="text-[11px] text-pine-200/70">Programación puntual de pedidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pie de Página */}
      <div className="relative z-10 flex items-center justify-between text-[11px] text-pine-200/70 border-t border-white/10 pt-4">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-gold-300" />
          Conexión Segura
        </span>
        <span>Nani Cake &copy; 2026</span>
      </div>
    </div>
  )
}
