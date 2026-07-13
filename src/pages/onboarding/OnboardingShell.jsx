import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProgressBar from '../../components/onboarding/ProgressBar'
import Step2Business from './Step2Business'
import Step3OpeningBalance from './Step3OpeningBalance'
import Step5InventorySetup from './Step5InventorySetup'
import Step4Welcome from './Step4Welcome'
import { useAuth, mapBusinessTypeToId } from '../../context/AuthContext'
import api from '../../api/axios'
import logo from '../../assets/images/logo1.png'

const TOTAL_STEPS = 4

const OnboardingShell = () => {
  const navigate = useNavigate()
  const { updateBusiness, setUser, setBusinesses } = useAuth()

  // Local caching/draft state
  const [draft, setDraft] = useState(() => {
    try {
      const saved = localStorage.getItem('dukamate_onboarding_draft')
      return saved ? JSON.parse(saved) : { step: 1, bizData: {}, products: [], businessCreated: false, createdBusiness: null }
    } catch {
      return { step: 1, bizData: {}, products: [], businessCreated: false, createdBusiness: null }
    }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Persist draft to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem('dukamate_onboarding_draft', JSON.stringify(draft))
    } catch (e) {
      console.error('Failed to save onboarding draft to localStorage', e)
    }
  }, [draft])

  const goNext = () => {
    setDraft(prev => ({ ...prev, step: Math.min(prev.step + 1, TOTAL_STEPS) }))
  }

  const goBack = () => {
    setDraft(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) }))
  }

  const handleStep1Success = (data) => {
    setDraft(prev => ({
      ...prev,
      bizData: { ...prev.bizData, ...data },
      step: 2
    }))
  }

  const handleStep2Success = (data) => {
    setDraft(prev => ({
      ...prev,
      bizData: { ...prev.bizData, ...data },
      step: 3
    }))
  }

  const handleFinalSubmit = async (productsList) => {
    setLoading(true)
    setError(null)

    // Save the current list of products in the draft so we can resume if interrupted
    setDraft(prev => ({ ...prev, products: productsList }))

    let activeBusiness = draft.createdBusiness

    try {
      // 1. Create Business if not already created
      if (!draft.businessCreated) {
        const businessPayload = {
          shop_name: draft.bizData.name.trim(),
          business_type_id: mapBusinessTypeToId(draft.bizData.business_type),
          phone_country_id: draft.bizData.phone_country_id ? Number(draft.bizData.phone_country_id) : null,
          phone_local_number: draft.bizData.phone_local_number ? draft.bizData.phone_local_number.trim() : null,
          location: draft.bizData.location.trim() || null,
          currency_id: draft.bizData.currency_id,
          opening_date: draft.bizData.opening_date,
        }

        // Only include country_id if the user selected one (integer, not iso_code)
        if (draft.bizData.country_id) {
          businessPayload.country_id = Number(draft.bizData.country_id)
        }

        // Only include opening_balance if the user actually entered one.
        // Omitting the field entirely (not sending 0) is the contract for "skipped".
        if (draft.bizData.opening_balance !== undefined) {
          const parsed = parseFloat(String(draft.bizData.opening_balance))
          if (!isNaN(parsed)) businessPayload.opening_balance = parsed
        }

        const res = await api.post('/businesses', businessPayload)
        activeBusiness = res.data

        // Mark business as created in draft
        setDraft(prev => ({
          ...prev,
          businessCreated: true,
          createdBusiness: activeBusiness
        }))

        // Update auth contexts immediately so Protected sees hasBusiness = true
        updateBusiness(activeBusiness)
        setBusinesses([activeBusiness])
        setUser(u => ({ ...u, business_id: activeBusiness.id }))
      } else {
        // If business was created previously but products failed, ensure auth context is current
        updateBusiness(activeBusiness)
      }

      // 2. Create products one by one
      const remainingProducts = [...productsList]
      const failedProducts = []

      while (remainingProducts.length > 0) {
        const currentProd = remainingProducts[0]
        try {
          const productPayload = {
            name: currentProd.name.trim(),
            selling_price: parseFloat(String(currentProd.selling_price)) || 0,
            stock_qty: parseFloat(String(currentProd.stock_qty)) || 0,
            low_stock_level: parseFloat(String(currentProd.low_stock_level)) || 5,
          }
          await api.post('/products', productPayload)
          // Success: pop from list and update draft
          remainingProducts.shift()
          setDraft(prev => ({ ...prev, products: [...remainingProducts, ...failedProducts] }))
        } catch (e) {
          // Failure: move it to failed list and pop it to process the next one
          console.error(`Failed to add product: ${currentProd.name}`, e)
          failedProducts.push(remainingProducts.shift())
        }
      }

      // 3. Complete setup
      if (failedProducts.length > 0) {
        // We had some failed products. Show error and update item list with only the failed ones
        setDraft(prev => ({ ...prev, products: failedProducts }))
        setError(`Failed to create ${failedProducts.length} items. Check the list below to edit and retry, or skip to continue.`)
      } else {
        // Everything succeeded!
        localStorage.removeItem('dukamate_onboarding_draft')
        setDraft(prev => ({
          ...prev,
          step: 4,
          products: [],
          businessCreated: false,
          createdBusiness: null
        }))
      }
    } catch (err) {
      console.error('Failed business setup onboarding', err)
      setError(err.response?.data?.detail || 'Could not verify or register your business. Please check details and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipRemainingProducts = () => {
    // If business is created, we can just clear draft and go to success screen
    if (draft.businessCreated) {
      localStorage.removeItem('dukamate_onboarding_draft')
      setDraft(prev => ({
        ...prev,
        step: 4,
        products: [],
        businessCreated: false,
        createdBusiness: null
      }))
    }
  }

  const currentStep = draft.step

  return (
    <div className="min-h-screen bg-bg-gray flex flex-col">
      {/* Header */}
      <header className="bg-surface border-b border-border px-8 py-4 flex items-center gap-3">
        <img src={logo} alt="Reecod" className="h-6 w-6 object-contain flex-shrink-0" />
        <span className="font-bold text-navy text-lg">Reecod</span>
      </header>

      {/* Progress */}
      {currentStep <= TOTAL_STEPS && (
        <div className="max-w-xl mx-auto w-full px-6 pt-8 pb-2">
          <ProgressBar step={currentStep} totalSteps={TOTAL_STEPS} />
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center px-6 py-6 font-sans">
        <div className="w-full max-w-xl fade-in" key={currentStep}>
          {currentStep === 1 && (
            <Step2Business
              initialData={draft.bizData}
              onSuccess={handleStep1Success}
            />
          )}
          {currentStep === 2 && (
            <Step3OpeningBalance
              onBack={goBack}
              initialData={draft.bizData}
              currency={draft.bizData?.currency}
              onSuccess={handleStep2Success}
            />
          )}
          {currentStep === 3 && (
            <Step5InventorySetup
              onBack={goBack}
              initialItems={draft.products}
              currency={draft.bizData?.currency}
              onSubmit={handleFinalSubmit}
              loading={loading}
              error={error}
            />
          )}
          {currentStep === 4 && (
            <Step4Welcome
              bizData={draft.createdBusiness || draft.bizData}
              onContinue={() => {
                localStorage.removeItem('dukamate_onboarding_draft')
                navigate('/dashboard')
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingShell
