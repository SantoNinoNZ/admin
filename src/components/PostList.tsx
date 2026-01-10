'use client'

import { useState } from 'react'
import type { UnifiedPost, StaticPost } from '@/types'
import { List, Button, Modal, Tag, Space, Typography, Empty, Avatar } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  FolderOutlined,
  TagOutlined,
  UserOutlined,
  FileMarkdownOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'

const { Text, Paragraph } = Typography

interface PostListProps {
  posts: UnifiedPost[]
  onEdit: (post: UnifiedPost) => void
  onDelete: (post: UnifiedPost) => void
}

export function PostList({ posts, onEdit, onDelete }: PostListProps) {
  const [postToDelete, setPostToDelete] = useState<UnifiedPost | null>(null)

  const showDeleteModal = (post: UnifiedPost) => {
    setPostToDelete(post)
  }

  const handleDeleteOk = () => {
    if (postToDelete) {
      onDelete(postToDelete)
      setPostToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setPostToDelete(null)
  }

  if (posts.length === 0) {
    return <Empty description="No posts found. Click 'New Post' to get started." />
  }

  return (
    <>
      <List
        itemLayout="vertical"
        size="large"
        dataSource={posts}
        renderItem={post => (
          <List.Item
            key={post.id}
            actions={[
              <Button icon={<EditOutlined />} onClick={() => onEdit(post)}>Edit</Button>,
              <Button icon={<DeleteOutlined />} danger onClick={() => showDeleteModal(post)}>Delete</Button>,
            ]}
            extra={
              post.image_url && (
                <img
                  width={200}
                  alt="Post featured image"
                  src={post.image_url}
                  style={{ objectFit: 'cover', height: 120 }}
                />
              )
            }
          >
            <List.Item.Meta
              avatar={<Avatar src={post.author_avatar_url || undefined} icon={<UserOutlined />} />}
              title={<a onClick={() => onEdit(post)}>{post.title}</a>}
              description={
                <Space size="middle">
                  <Text type="secondary">
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString()
                      : `Created: ${new Date(post.created_at).toLocaleDateString()}`}
                  </Text>
                   {post.category_name && (
                    <Tag icon={<FolderOutlined />} color="blue">
                      {post.category_name}
                    </Tag>
                  )}
                </Space>
              }
            />
            <Paragraph ellipsis={{ rows: 2, expandable: false }}>
              {post.excerpt}
            </Paragraph>
            <Space wrap>
              <Tag color={post.published ? 'green' : 'orange'}>
                {post.published ? 'Published' : 'Draft'}
              </Tag>
              {'source' in post && post.source === 'static' ? (
                <Tag icon={<FileMarkdownOutlined />} color="blue">
                  Static File
                </Tag>
              ) : (
                <Tag icon={<DatabaseOutlined />} color="purple">
                  Database
                </Tag>
              )}
              {Array.isArray(post.tags) && post.tags.map((tag: any) => (
                <Tag icon={<TagOutlined />} key={tag.id}>{tag.name}</Tag>
              ))}
            </Space>
          </List.Item>
        )}
      />

      <Modal
        title="Delete Post"
        open={!!postToDelete}
        onOk={handleDeleteOk}
        onCancel={handleDeleteCancel}
        okText="Delete"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
      >
        <p>Are you sure you want to delete the post titled &quot;{postToDelete?.title}&quot;?</p>
        <p>This action cannot be undone.</p>
      </Modal>
    </>
  )
}
