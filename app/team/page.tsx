'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserPlus, Settings, Shield, Mail, Trash2, Edit, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canInvite: boolean;
  };
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: string;
}

export default function TeamPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTeams();
    }
  }, [user]);

  const loadTeams = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // ユーザーが所属するチームを取得
      const teamsQuery = query(
        collection(db, 'teams'),
        where('memberIds', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(teamsQuery);
      
      const teamsData: Team[] = [];
      snapshot.forEach((doc) => {
        teamsData.push({
          id: doc.id,
          ...doc.data()
        } as Team);
      });

      setTeams(teamsData);
      if (teamsData.length > 0 && !selectedTeam) {
        setSelectedTeam(teamsData[0]);
      }
    } catch (error) {
      console.error('チーム情報の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!user) return;

    const teamName = prompt('チーム名を入力してください:');
    if (!teamName) return;

    try {
      const newTeam = {
        name: teamName,
        ownerId: user.uid,
        memberIds: [user.uid],
        members: [{
          id: user.uid,
          email: user.email || '',
          name: user.displayName || user.email || '',
          role: 'owner',
          joinedAt: new Date().toISOString(),
          permissions: {
            canEdit: true,
            canDelete: true,
            canShare: true,
            canInvite: true
          }
        }],
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'teams'), newTeam);
      await loadTeams();
      alert('チームを作成しました');
    } catch (error) {
      console.error('チーム作成エラー:', error);
      alert('チームの作成に失敗しました');
    }
  };

  const inviteMember = async () => {
    if (!selectedTeam || !inviteEmail) return;

    try {
      // メール招待の処理（実際にはメール送信APIを呼び出す）
      const invitation = {
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        invitedBy: user?.email,
        invitedEmail: inviteEmail,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'invitations'), invitation);
      
      // TODO: メール送信処理
      alert(`${inviteEmail} に招待を送信しました`);
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error) {
      console.error('招待エラー:', error);
      alert('招待の送信に失敗しました');
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!selectedTeam) return;

    try {
      const teamRef = doc(db, 'teams', selectedTeam.id);
      const updatedMembers = selectedTeam.members.map(member => {
        if (member.id === memberId) {
          return {
            ...member,
            role: newRole,
            permissions: newRole === 'admin' 
              ? { canEdit: true, canDelete: true, canShare: true, canInvite: true }
              : { canEdit: true, canDelete: false, canShare: true, canInvite: false }
          };
        }
        return member;
      });

      await updateDoc(teamRef, { members: updatedMembers });
      await loadTeams();
      alert('権限を更新しました');
    } catch (error) {
      console.error('権限更新エラー:', error);
      alert('権限の更新に失敗しました');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!selectedTeam || !confirm('このメンバーを削除してもよろしいですか？')) return;

    try {
      const teamRef = doc(db, 'teams', selectedTeam.id);
      const updatedMembers = selectedTeam.members.filter(m => m.id !== memberId);
      const updatedMemberIds = updatedMembers.map(m => m.id);

      await updateDoc(teamRef, { 
        members: updatedMembers,
        memberIds: updatedMemberIds
      });
      await loadTeams();
      alert('メンバーを削除しました');
    } catch (error) {
      console.error('メンバー削除エラー:', error);
      alert('メンバーの削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="w-8 h-8 mr-3" />
                チーム管理
              </h1>
              <p className="mt-2 text-gray-600">
                チームメンバーと名刺を共有し、効率的に管理できます
              </p>
            </div>
            <Link
              href="/dashboard"
              className="bg-gray-600 text-white rounded-lg py-2 px-4 hover:bg-gray-700 flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              ダッシュボードに戻る
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* チームリスト */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">所属チーム</h2>
                  <Button
                    onClick={createTeam}
                    size="sm"
                    variant="primary"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    新規作成
                  </Button>
                </div>
              </div>
              <div className="p-2">
                {teams.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    チームに所属していません
                  </p>
                ) : (
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedTeam?.id === team.id
                            ? 'bg-blue-50 border-blue-500 border'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-gray-500">
                          {team.members.length}人のメンバー
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* メンバー詳細 */}
          <div className="lg:col-span-2">
            {selectedTeam ? (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedTeam.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        作成日: {new Date(selectedTeam.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowInviteModal(true)}
                        variant="primary"
                        size="sm"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        メンバー招待
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* メンバーリスト */}
                <div className="p-4">
                  <h3 className="font-medium mb-4">メンバー一覧</h3>
                  <div className="space-y-3">
                    {selectedTeam.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                          {member.role === 'owner' && (
                            <span className="ml-3 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              オーナー
                            </span>
                          )}
                          {member.role === 'admin' && (
                            <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              管理者
                            </span>
                          )}
                        </div>
                        {member.role !== 'owner' && selectedTeam.ownerId === user?.uid && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateMemberRole(
                                member.id,
                                member.role === 'admin' ? 'member' : 'admin'
                              )}
                              className="p-2 hover:bg-gray-200 rounded"
                              title="権限を変更"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeMember(member.id)}
                              className="p-2 hover:bg-red-100 text-red-600 rounded"
                              title="メンバーを削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 権限設定 */}
                <div className="p-4 border-t bg-gray-50">
                  <h3 className="font-medium mb-3">権限設定</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="font-medium">オーナー:</span>
                      <span className="ml-2">すべての権限</span>
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="font-medium">管理者:</span>
                      <span className="ml-2">編集、削除、共有、招待</span>
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-gray-600" />
                      <span className="font-medium">メンバー:</span>
                      <span className="ml-2">閲覧、編集、共有</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">チームを選択してください</p>
              </div>
            )}
          </div>
        </div>

        {/* 招待モーダル */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold mb-4">メンバーを招待</h3>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="メールアドレスを入力"
                className="w-full px-3 py-2 border rounded-lg mb-4"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowInviteModal(false)}
                  variant="secondary"
                  fullWidth
                >
                  キャンセル
                </Button>
                <Button
                  onClick={inviteMember}
                  variant="primary"
                  fullWidth
                  disabled={!inviteEmail}
                >
                  招待を送信
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}