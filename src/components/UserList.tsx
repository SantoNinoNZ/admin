'use client'

import { useState } from 'react'
import type { User, Invite } from '@/types'
import { List, Space, Typography, Empty, Avatar, Button, Modal, Form, Input, message, Tag, Tabs } from 'antd'
import {
  CalendarOutlined,
  UserOutlined,
  UserAddOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { supabaseAPI } from '@/lib/supabase-api'

const { Text, Paragraph } = Typography

interface UserListProps {
  users: User[]
}

export function UserList({ users }: UserListProps) {
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null)
  const [form] = Form.useForm()

  const loadInvites = async () => {
    try {
      setLoadingInvites(true)
      const data = await supabaseAPI.getInvites()
      setInvites(data)
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to load invites')
    } finally {
      setLoadingInvites(false)
    }
  }

  const handleOpenInviteModal = () => {
    setInviteModalOpen(true)
    loadInvites()
  }

  const handleCreateInvite = async (values: { email: string; expiresInDays: number }) => {
    try {
      setCreatingInvite(true)
      const { token } = await supabaseAPI.createInvite(values.email, values.expiresInDays || 7)

      const inviteUrl = `${window.location.origin}/invite?token=${token}`
      setGeneratedInviteLink(inviteUrl)

      form.resetFields()
      await loadInvites()
      message.success('Invite created successfully!')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to create invite')
    } finally {
      setCreatingInvite(false)
    }
  }

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    message.success('Invite link copied to clipboard!')
  }

  const handleCloseModal = () => {
    setInviteModalOpen(false)
    setGeneratedInviteLink(null)
    form.resetFields()
  }
  const pendingInvites = invites.filter(inv => !inv.used_at && new Date(inv.expires_at) > new Date())
  const usedInvites = invites.filter(inv => inv.used_at)
  const expiredInvites = invites.filter(inv => !inv.used_at && new Date(inv.expires_at) <= new Date())

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={handleOpenInviteModal}
        >
          Invite New Admin
        </Button>
      </div>

      <List
        itemLayout="horizontal"
        size="large"
        dataSource={users}
        renderItem={user => (
          <List.Item key={user.id}>
            <List.Item.Meta
              avatar={<Avatar src={user.user_metadata?.avatar_url || undefined} icon={<UserOutlined />} />}
              title={user.user_metadata?.name || user.email}
              description={
                <Space size="middle">
                  <Text type="secondary">
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    {`Joined: ${new Date(user.created_at).toLocaleDateString()}`}
                  </Text>
                  {user.is_admin && <Tag color="blue">Admin</Tag>}
                </Space>
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title="Invite New Admin"
        open={inviteModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={700}
      >
        {generatedInviteLink ? (
          <div>
            <Text strong>Invite link generated successfully!</Text>
            <Paragraph copyable={{ text: generatedInviteLink, icon: <CopyOutlined /> }}>
              <Input.TextArea
                value={generatedInviteLink}
                readOnly
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ marginTop: 16 }}
              />
            </Paragraph>
            <Space>
              <Button onClick={() => setGeneratedInviteLink(null)}>Create Another</Button>
              <Button type="primary" onClick={handleCloseModal}>Done</Button>
            </Space>
          </div>
        ) : (
          <>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCreateInvite}
              initialValues={{ expiresInDays: 7 }}
            >
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Please enter an email address' },
                  { type: 'email', message: 'Please enter a valid email address' }
                ]}
              >
                <Input placeholder="admin@example.com" />
              </Form.Item>

              <Form.Item
                name="expiresInDays"
                label="Expires In (days)"
                rules={[{ required: true, message: 'Please enter expiration days' }]}
              >
                <Input type="number" min={1} max={30} placeholder="7" />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={creatingInvite}>
                    Generate Invite Link
                  </Button>
                  <Button onClick={handleCloseModal}>Cancel</Button>
                </Space>
              </Form.Item>
            </Form>

            <Tabs
              items={[
                {
                  key: 'pending',
                  label: `Pending (${pendingInvites.length})`,
                  children: (
                    <List
                      size="small"
                      loading={loadingInvites}
                      dataSource={pendingInvites}
                      renderItem={invite => (
                        <List.Item
                          key={invite.id}
                          actions={[
                            <Button
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => handleCopyLink(`${window.location.origin}/invite?token=${invite.token}`)}
                            >
                              Copy
                            </Button>
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<ClockCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                            title={invite.email}
                            description={`Expires: ${new Date(invite.expires_at).toLocaleDateString()}`}
                          />
                        </List.Item>
                      )}
                    />
                  ),
                },
                {
                  key: 'used',
                  label: `Used (${usedInvites.length})`,
                  children: (
                    <List
                      size="small"
                      loading={loadingInvites}
                      dataSource={usedInvites}
                      renderItem={invite => (
                        <List.Item key={invite.id}>
                          <List.Item.Meta
                            avatar={<CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
                            title={invite.email}
                            description={`Used: ${invite.used_at ? new Date(invite.used_at).toLocaleDateString() : 'N/A'}`}
                          />
                        </List.Item>
                      )}
                    />
                  ),
                },
                {
                  key: 'expired',
                  label: `Expired (${expiredInvites.length})`,
                  children: (
                    <List
                      size="small"
                      loading={loadingInvites}
                      dataSource={expiredInvites}
                      renderItem={invite => (
                        <List.Item key={invite.id}>
                          <List.Item.Meta
                            avatar={<ClockCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />}
                            title={invite.email}
                            description={`Expired: ${new Date(invite.expires_at).toLocaleDateString()}`}
                          />
                        </List.Item>
                      )}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Modal>
    </>
  )
}
