import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [backendMessage, setBackendMessage] = useState('Loading...')
  const [backendStatus, setBackendStatus] = useState('pending')
  const [supabaseTest, setSupabaseTest] = useState('Loading...')

  useEffect(() => {
    // Test backend connection
    fetch('http://localhost:8000')
      .then(res => res.json())
      .then(data => {
        setBackendMessage(data.message)
        setBackendStatus('success')
      })
      .catch(err => {
        setBackendMessage('Backend connection failed')
        setBackendStatus('error')
        console.error(err)
      })

    // Test Supabase from backend
    fetch('http://localhost:8000/test-supabase')
      .then(res => res.json())
      .then(data => {
        setSupabaseTest(data.message)
      })
      .catch(err => {
        setSupabaseTest('Supabase test failed')
        console.error(err)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">
            CITE-TMS
          </h1>
          <p className="text-gray-600">
            De La Salle Lipa Research Repository
          </p>
        </div>

        <div className="space-y-4">
          {/* Frontend Status */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <p className="font-semibold text-green-800">Frontend</p>
                <p className="text-sm text-green-600">Running on localhost:5173</p>
              </div>
            </div>
          </div>

          {/* Backend Status */}
          <div className={`border rounded-lg p-4 ${
            backendStatus === 'success' 
              ? 'bg-green-50 border-green-200' 
              : backendStatus === 'error'
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                backendStatus === 'success' 
                  ? 'bg-green-500 animate-pulse' 
                  : backendStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-gray-400 animate-pulse'
              }`}></div>
              <div>
                <p className={`font-semibold ${
                  backendStatus === 'success' ? 'text-green-800' : 
                  backendStatus === 'error' ? 'text-red-800' : 
                  'text-gray-800'
                }`}>Backend</p>
                <p className={`text-sm ${
                  backendStatus === 'success' ? 'text-green-600' : 
                  backendStatus === 'error' ? 'text-red-600' : 
                  'text-gray-600'
                }`}>{backendMessage}</p>
              </div>
            </div>
          </div>

          {/* Supabase Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <p className="font-semibold text-blue-800">Supabase</p>
                <p className="text-sm text-blue-600">{supabaseTest}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            All systems ready for development! 🚀
          </p>
        </div>
      </div>
    </div>
  )
}

export default App