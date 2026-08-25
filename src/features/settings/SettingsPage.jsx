import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Building, CreditCard, Layers, Warehouse, Upload,
  Save, Check, Plus, Edit2, Trash2, X, AlertCircle
} from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import CategoryManager from '@/features/products/components/CategoryManager'
import { useProductCategories } from '@/features/products/hooks/useProducts'
import { useInventoryCategories } from '@/features/inventory/hooks/useInventory'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('negocio')
  const { settings, updateSettings, fetchSettings } = useSettingsStore()
  const [savingSettings, setSavingSettings] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  // Métodos de pago
  const [paymentMethods, setPaymentMethods] = useState([])
  const [newPaymentName, setNewPaymentName] = useState('')
  const [loadingPayment, setLoadingPayment] = useState(false)

  // Categorías
  const { categories: prodCats, refetch: refetchProdCats } = useProductCategories()
  const { categories: invCats, refetch: refetchInvCats } = useInventoryCategories()

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      business_name: 'Madrigales Pastelería',
      address: '',
      phone: '',
      whatsapp: '',
      email: '',
      currency_symbol: 'L',
      invoice_header: '',
      invoice_footer: '¡Gracias por endulzar tus momentos con Madrigales Pastelería! 🎂',
    },
  })

  useEffect(() => {
    if (settings) {
      reset({
        business_name: settings.business_name || 'Madrigales Pastelería',
        address: settings.address || '',
        phone: settings.phone || '',
        whatsapp: settings.whatsapp || '',
        email: settings.email || '',
        currency_symbol: settings.currency_symbol || 'L',
        invoice_header: settings.invoice_header || '',
        invoice_footer: settings.invoice_footer || '¡Gracias por endulzar tus momentos con Madrigales Pastelería! 🎂',
      })
      setLogoPreview(settings.logo_url || null)
    }
  }, [settings, reset])

  const fetchPayments = async () => {
    try {
      const { data } = await supabase.from('payment_methods').select('*').order('name')
      setPaymentMethods(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  // Guardar configuración general
  const onSaveBusinessInfo = async (values) => {
    try {
      setSavingSettings(true)
      let logoUrl = settings?.logo_url || null

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const filePath = `business/logo_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('business')
          .upload(filePath, logoFile, { upsert: true })

        if (!uploadError) {
          const { data } = supabase.storage.from('business').getPublicUrl(filePath)
          logoUrl = data.publicUrl
        }
      }

      await updateSettings({
        ...values,
        logo_url: logoUrl,
      })

      await logActivity({
        action: 'Actualizó la configuración general del negocio',
        entityType: 'settings',
      })

      toast.success('Configuración guardada exitosamente')
      fetchSettings()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar configuración: ' + err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  // Agregar método de pago
  const handleAddPaymentMethod = async (e) => {
    e.preventDefault()
    if (!newPaymentName.trim()) return

    try {
      setLoadingPayment(true)
      const { data, error } = await supabase
        .from('payment_methods')
        .insert([{ name: newPaymentName.trim(), is_active: true }])
        .select()
        .single()

      if (error) throw error

      await logActivity({
        action: `Agregó el método de pago "${newPaymentName.trim()}"`,
        entityType: 'payment_method',
        entityId: data.id,
      })

      toast.success('Método de pago agregado')
      setNewPaymentName('')
      fetchPayments()
    } catch (err) {
      console.error(err)
      toast.error('Error al agregar: ' + err.message)
    } finally {
      setLoadingPayment(false)
    }
  }

  const handleTogglePaymentStatus = async (pm) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !pm.is_active })
        .eq('id', pm.id)

      if (error) throw error
      toast.success('Estado del método de pago actualizado')
      fetchPayments()
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar método de pago')
    }
  }

  // Gestor de Categorías de Almacén
  const [newInvCat, setNewInvCat] = useState('')
  const handleAddInvCategory = async (e) => {
    e.preventDefault()
    if (!newInvCat.trim()) return
    try {
      const { error } = await supabase
        .from('inventory_categories')
        .insert([{ name: newInvCat.trim() }])
      if (error) throw error
      toast.success('Categoría de almacén agregada')
      setNewInvCat('')
      refetchInvCats()
    } catch (err) {
      toast.error('Error al agregar categoría: ' + err.message)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración del Sistema</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Parámetros generales de Madrigales Pastelería, métodos de pago y catálogos
        </p>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-2">
        {[
          { id: 'negocio', label: 'Datos del Negocio', icon: Building },
          { id: 'pagos', label: 'Métodos de Pago', icon: CreditCard },
          { id: 'prod_cats', label: 'Categorías de Productos', icon: Layers },
          { id: 'inv_cats', label: 'Categorías de Almacén', icon: Warehouse },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Pestaña: Datos del Negocio */}
      {activeTab === 'negocio' && (
        <form onSubmit={handleSubmit(onSaveBusinessInfo)} className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
              Información General y Comprobantes
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre del Negocio *</label>
                <input {...register('business_name')} type="text" className="input" />
              </div>

              <div>
                <label className="label">Símbolo de Moneda</label>
                <input {...register('currency_symbol')} type="text" className="input" />
              </div>

              <div>
                <label className="label">Teléfono Principal</label>
                <input {...register('phone')} type="text" className="input" />
              </div>

              <div>
                <label className="label">WhatsApp para Pedidos</label>
                <input {...register('whatsapp')} type="text" className="input" />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Correo Electrónico de Contacto</label>
                <input {...register('email')} type="email" className="input" />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Dirección Física</label>
                <input {...register('address')} type="text" className="input" />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Mensaje al Pie del Comprobante PDF</label>
                <textarea {...register('invoice_footer')} rows="2" className="input text-xs" />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={savingSettings}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Guardando...' : 'Guardar Configuración'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Pestaña: Métodos de Pago */}
      {activeTab === 'pagos' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
            Métodos de Pago Disponibles
          </h2>

          <form onSubmit={handleAddPaymentMethod} className="flex gap-2">
            <input
              type="text"
              placeholder="Nuevo método de pago (ej. Transferencia BAC, Efectivo, Tarjeta)..."
              value={newPaymentName}
              onChange={(e) => setNewPaymentName(e.target.value)}
              className="input text-xs flex-1"
            />
            <button
              type="submit"
              disabled={loadingPayment || !newPaymentName.trim()}
              className="btn-primary text-xs"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </form>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="p-3 flex items-center justify-between hover:bg-gray-50 text-xs">
                <span className="font-semibold text-gray-800">{pm.name}</span>
                <button
                  type="button"
                  onClick={() => handleTogglePaymentStatus(pm)}
                  className={`badge cursor-pointer text-[10px] font-bold ${
                    pm.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {pm.is_active ? 'Activo' : 'Inactivo'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestaña: Categorías de Productos */}
      {activeTab === 'prod_cats' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
            Categorías del Catálogo de Productos
          </h2>
          <CategoryManager categories={prodCats} onRefresh={refetchProdCats} />
        </div>
      )}

      {/* Pestaña: Categorías de Almacén */}
      {activeTab === 'inv_cats' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
            Categorías de Materias Primas e Insumos
          </h2>

          <form onSubmit={handleAddInvCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva categoría (ej. Harinas, Chocolates, Lácteos, Cajas)..."
              value={newInvCat}
              onChange={(e) => setNewInvCat(e.target.value)}
              className="input text-xs flex-1"
            />
            <button
              type="submit"
              disabled={!newInvCat.trim()}
              className="btn-primary text-xs"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </form>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
            {invCats.map((cat) => (
              <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-gray-50 text-xs">
                <span className="font-semibold text-gray-800">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
