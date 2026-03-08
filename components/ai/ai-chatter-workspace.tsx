'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  MessageSquare, 
  DollarSign, 
  Clock,
  Send,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { ChatAssistant } from './chat-assistant'
import { FanInsightsPanel } from './fan-insights-panel'

// Sample conversation data
const sampleConversations = [
  {
    id: '1',
    fanUsername: 'Mike_T',
    lastMessage: 'hey what are you doing tonight',
    unread: 2,
    fanTier: 'whale',
    platform: 'onlyfans',
    totalSpent: 2500,
    lastActive: '2 min ago',
  },
  {
    id: '2',
    fanUsername: 'JohnnyBoy99',
    lastMessage: 'That last video was amazing!',
    unread: 0,
    fanTier: 'regular',
    platform: 'fansly',
    totalSpent: 450,
    lastActive: '15 min ago',
  },
  {
    id: '3',
    fanUsername: 'SteveM',
    lastMessage: 'Do you do custom content?',
    unread: 1,
    fanTier: 'vip',
    platform: 'onlyfans',
    totalSpent: 1200,
    lastActive: '1 hour ago',
  },
  {
    id: '4',
    fanUsername: 'Anonymous_Fan',
    lastMessage: 'Just subscribed!',
    unread: 1,
    fanTier: 'new',
    platform: 'mym',
    totalSpent: 15,
    lastActive: '2 hours ago',
  },
]

const sampleMessages = [
  { id: '1', role: 'fan', content: 'Hey beautiful!', timestamp: '10:30 AM' },
  { id: '2', role: 'creator', content: 'Hey babe! How are you doing today? 😊', timestamp: '10:32 AM' },
  { id: '3', role: 'fan', content: 'Good! Just thinking about you', timestamp: '10:33 AM' },
  { id: '4', role: 'creator', content: 'Aww thats so sweet! I was just about to post something special...', timestamp: '10:35 AM' },
  { id: '5', role: 'fan', content: 'hey what are you doing tonight', timestamp: '10:45 AM' },
]

export function AIChatterWorkspace() {
  const [selectedConversation, setSelectedConversation] = useState(sampleConversations[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [replyText, setReplyText] = useState('')
  const [messages, setMessages] = useState(sampleMessages)

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      whale: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      vip: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      regular: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      new: 'bg-green-500/20 text-green-400 border-green-500/30',
    }
    return colors[tier] || 'bg-muted text-muted-foreground'
  }

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      onlyfans: 'bg-sky-500/20 text-sky-400',
      fansly: 'bg-cyan-500/20 text-cyan-400',
      mym: 'bg-pink-500/20 text-pink-400',
    }
    return colors[platform] || 'bg-muted text-muted-foreground'
  }

  const handleSend = () => {
    if (!replyText.trim()) return
    const newMessage = {
      id: String(messages.length + 1),
      role: 'creator',
      content: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages([...messages, newMessage])
    setReplyText('')
  }

  const handleSuggestionSelect = (text: string) => {
    setReplyText(text)
  }

  const filteredConversations = sampleConversations.filter(conv =>
    conv.fanUsername.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr_320px]">
      {/* Conversations List */}
      <Card className="lg:h-[calc(100vh-280px)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Active Conversations
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search fans..." 
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] lg:h-[calc(100vh-400px)]">
            <div className="space-y-1 p-2">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedConversation.id === conv.id 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-muted text-xs">
                        {conv.fanUsername.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{conv.fanUsername}</span>
                        {conv.unread > 0 && (
                          <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary">
                            {conv.unread}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getTierColor(conv.fanTier)}`}>
                          {conv.fanTier.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getPlatformColor(conv.platform)}`}>
                          {conv.platform}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                          <DollarSign className="h-2.5 w-2.5" />
                          {conv.totalSpent}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Window */}
      <Card className="lg:h-[calc(100vh-280px)] flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-muted">
                  {selectedConversation.fanUsername.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  {selectedConversation.fanUsername}
                  <Badge variant="outline" className={`text-[9px] ${getTierColor(selectedConversation.fanTier)}`}>
                    {selectedConversation.fanTier.toUpperCase()}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {selectedConversation.lastActive}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${getPlatformColor(selectedConversation.platform)}`}>
                {selectedConversation.platform}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <DollarSign className="h-3 w-3 mr-0.5" />
                ${selectedConversation.totalSpent}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'creator' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      msg.role === 'creator'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.role === 'creator' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Reply Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <Button onClick={handleSend} size="icon" className="h-[60px] w-[60px]">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant Panel */}
      <div className="space-y-4 lg:h-[calc(100vh-280px)] overflow-auto">
        <ChatAssistant
          fanMessage={messages[messages.length - 1]?.role === 'fan' ? messages[messages.length - 1].content : ''}
          conversationHistory={messages.map(m => `${m.role}: ${m.content}`).join('\n')}
          fanTier={selectedConversation.fanTier}
          onSelectSuggestion={handleSuggestionSelect}
        />
        
        <FanInsightsPanel
          fanData={{
            username: selectedConversation.fanUsername,
            subscriptionAge: 45,
            totalSpent: selectedConversation.totalSpent,
            messageCount: 127,
            tipCount: 8,
            tipTotal: 340,
            ppvCount: 12,
            ppvTotal: 180,
            lastActive: selectedConversation.lastActive,
            avgResponseTime: '5 minutes',
            renewalRate: 85,
            platform: selectedConversation.platform,
          }}
        />

        {/* Quick Stats */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Upsell Success Rate
              </span>
              <span className="text-green-400 font-medium">68%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Response Rate
              </span>
              <span className="font-medium">94%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Pending Replies
              </span>
              <span className="text-amber-400 font-medium">4</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
