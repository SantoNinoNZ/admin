'use client'

import type { User } from '@/types'
import { List, Space, Typography, Empty, Avatar } from 'antd'
import {
  CalendarOutlined,
  UserOutlined,
} from '@ant-design/icons'

const { Text } = Typography

interface UserListProps {
  users: User[]
}

export function UserList({ users }: UserListProps) {
  if (users.length === 0) {
    return <Empty description="No users found." />
  }

  return (
    <List
      itemLayout="horizontal"
      size="large"
      dataSource={users}
      renderItem={user => (
        <List.Item
          key={user.id}
        >
          <List.Item.Meta
            avatar={<Avatar src={user.user_metadata?.avatar_url || undefined} icon={<UserOutlined />} />}
            title={user.user_metadata?.name || user.email}
            description={
              <Space size="middle">
                <Text type="secondary">
                  <CalendarOutlined style={{ marginRight: 8 }} />
                  {`Joined: ${new Date(user.created_at).toLocaleDateString()}`}
                </Text>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  )
}
