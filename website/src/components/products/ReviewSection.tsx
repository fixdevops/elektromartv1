'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Star, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { Product, Review } from '@/types/database'
import toast from 'react-hot-toast'

interface Props {
  product: Product
  reviews: Review[]
}

type ReviewAuthor = { id: string; full_name: string | null; avatar_url: string | null }

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export default function ReviewSection({ product, reviews: initialReviews }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? [])
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [hovered, setHovered] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuthStore()

  // Nama penulis diambil dari view review_authors (bukan tabel profiles yang RLS-nya ketat).
  useEffect(() => {
    let active = true
    const missingIds = Array.from(new Set(
      (initialReviews ?? []).filter(r => !r.profile?.full_name).map(r => r.user_id),
    ))
    if (!missingIds.length) return

    const supabase = createClient()
    supabase
      .from('review_authors')
      .select('id, full_name, avatar_url')
      .in('id', missingIds)
      .then(({ data, error }) => {
        if (!active || error || !data?.length) return
        setReviews(prev => prev.map(review => {
          const author = (data as ReviewAuthor[]).find(a => a.id === review.user_id)
          return author && !review.profile?.full_name ? { ...review, profile: author } : review
        }))
      })

    return () => { active = false }
  }, [initialReviews])

  const distribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach(review => {
      const value = Math.max(1, Math.min(5, Math.round(review.rating)))
      counts[value] += 1
    })
    return counts
  }, [reviews])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Silakan masuk untuk menulis ulasan')
      return
    }
    if (!comment.trim()) {
      toast.error('Tulis pengalamanmu terlebih dahulu')
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('reviews')
      .insert({ product_id: product.id, user_id: user.id, rating, comment: comment.trim() })
      .select('*')
      .single()

    if (error || !data) {
      toast.error(
        error?.message?.toLowerCase().includes('unique')
          ? 'Kamu sudah pernah mengulas produk ini'
          : 'Gagal mengirim ulasan, silakan coba lagi',
      )
      setSubmitting(false)
      return
    }

    const { data: author } = await supabase
      .from('review_authors')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    setReviews(prev => [{ ...(data as Review), profile: (author as ReviewAuthor | null) ?? undefined }, ...prev])
    setComment('')
    setRating(5)
    setSubmitting(false)
    toast.success('Ulasan berhasil dikirim')
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-5">
        <span className="w-1 h-6 bg-brand rounded-full" />
        <h2 className="text-lg font-bold text-gray-800">Ulasan Pembeli ({reviews.length})</h2>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Ringkasan + form */}
        <div className="space-y-3">
          <div className="border border-gray-200 rounded-sm p-4 bg-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-brand">
                {product.rating > 0 ? product.rating.toFixed(1) : '0.0'}
              </span>
              <div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={cn(
                        'w-4 h-4',
                        star <= Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{reviews.length} ulasan</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map(star => {
                const count = distribution[star]
                const percent = reviews.length ? Math.round((count / reviews.length) * 100) : 0
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-8 flex items-center gap-0.5">
                      {star} <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border border-gray-200 rounded-sm p-4 bg-white">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Tulis Ulasan</h3>
            {user ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Rating kamu</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Beri rating ${star}`}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setRating(star)}
                        className="p-1.5 -m-1 flex items-center justify-center"
                      >
                        <Star
                          className={cn(
                            'w-7 h-7 transition-colors',
                            star <= (hovered || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Ceritakan pengalamanmu dengan produk ini..."
                  rows={4}
                  className="input resize-none"
                />
                <button type="submit" disabled={submitting} className="btn-primary w-full !py-2.5 text-sm">
                  {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
                </button>
              </form>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-gray-600 mb-3">Masuk untuk menulis ulasan produk ini.</p>
                <Link href="/auth/login" className="inline-block bg-brand text-white text-sm font-semibold px-5 py-2 rounded-sm hover:bg-brand-dark">
                  Masuk Sekarang
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Daftar ulasan */}
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-sm py-12 text-center">
              <p className="text-sm font-medium text-gray-700">Belum ada ulasan</p>
              <p className="text-xs text-gray-500 mt-1">Jadilah pembeli pertama yang berbagi pengalaman.</p>
            </div>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {review.profile?.full_name ?? 'Pengguna ElektroMart'}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                    </div>
                    <div className="flex mt-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={cn(
                            'w-3.5 h-3.5',
                            star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
                          )}
                        />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 leading-relaxed mt-2 break-words">{review.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
