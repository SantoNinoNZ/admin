'use client'

import { useState, useEffect } from 'react'
import { supabaseAPI } from '@/lib/supabase-api'
import type { User } from '@/types'
import { UserList } from '@/components/UserList'
import { Spin, Alert, Typography } from 'antd'

const { Title } = Typography

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await supabaseAPI.getUsers()
      setUsers(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>
  }

  if (error && users.length === 0) {
    return <Alert message="Error" description={error} type="error" showIcon closable />
  }

  return (
    <>
      <Title level={2}>Users</Title>
      <p style={{ marginBottom: 16, color: '#666' }}>Manage your users ({users.length} total)</p>
      <UserList users={users} onRefresh={loadUsers} />
    </>
  )
}
