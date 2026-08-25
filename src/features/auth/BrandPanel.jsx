import React from 'react'
import { ShoppingBag, Warehouse, Calendar, ShieldCheck } from 'lucide-react'

export default function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-10 overflow-hidden bg-gradient-to-br from-[#161120] via-[#100C16] to-[#0A0D15] border-r border-white/10 text-white">
      {/* Luz ambiental sutil */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Encabezado Superior: Logo Oficial & Nombre */}
      <div className="relative z-10 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-white/95 p-2 border border-white/20 shadow-md flex items-center justify-center">
          <img
            src="/LOGO_OFICIAL.png"
            alt="Madrigales Pastelería"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <span className="text-lg font-extrabold tracking-tight text-white block">
            Madrigales
          </span>
          <span className="text-[10px] font-bold tracking-[0.2em] text-pink-400 uppercase block">
            Pastelería &middot; Sistema POS
          </span>
        </div>
      </div>

      {/* Centro: Panel de Presentación Profesional con el Logo Oficial */}
      <div className="relative z-10 my-auto py-6 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-32 h-32 rounded-3xl bg-white/95 border border-white/20 p-3 shadow-2xl flex items-center justify-center">
            <img
              src="/LOGO_OFICIAL.png"
              alt="Madrigales Pastelería"
              className="w-full h-full object-contain filter drop-shadow-sm"
            />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Madrigales Pastelería
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Plataforma integral para la administración de pedidos, inventario y facturación.
            </p>
          </div>
        </div>

        {/* Módulos clave en tarjetas minimalistas */}
        <div className="grid grid-cols-1 gap-2.5 max-w-sm mx-auto w-full pt-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Punto de Venta & Pedidos</p>
              <p className="text-[11px] text-slate-400">Emisión de facturas y control de saldos</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Almacén & Materias Primas</p>
              <p className="text-[11px] text-slate-400">Control de existencias y alertas de stock</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Calendario de Entregas</p>
              <p className="text-[11px] text-slate-400">Programación puntual de pedidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pie de Página */}
      <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-4">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Conexión Segura
        </span>
        <span>Madrigales &copy; 2026</span>
      </div>
    </div>
  )
}
