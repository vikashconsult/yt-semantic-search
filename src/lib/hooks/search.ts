'use client'

import * as React from 'react'
import { useRouter } from 'next/router'
import { useDebounce, useSearchParam } from 'react-use'
import useSWR from 'swr'
import { createContainer } from 'unstated-next'

// import { StringParam, useQueryParam, withDefault } from 'use-query-params'
import * as types from '@/types'

const fetcher = ({
  url,
  body
}: {
  url: string
  body: types.SearchQuery
}): Promise<types.SearchResult[]> =>
  fetch(
    `${url}?${new URLSearchParams({
      query: body.query,
      limit: body.limit ? `${body.limit}` : undefined
    })}`
  ).then((res) => res.json())

function useSearch() {
  const router = useRouter()
  const [query, setQuery] = React.useState<string>('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')

  React.useEffect(() => {
    const url = new URL(window.location.href)
    const query = url.searchParams.get('query')
    if (query) {
      setQuery(query)
      setDebouncedQuery(query)
    }
  }, [])

  useDebounce(
    () => {
      setDebouncedQuery(query)
    },
    500,
    [query]
  )

  const body = React.useMemo<types.SearchQuery>(
    () => ({
      query: debouncedQuery,
      limit: 10
    }),
    [debouncedQuery]
  )

  const {
    data: results,
    error,
    isLoading,
    isValidating
  } = useSWR<types.SearchResult[], Error>(
    {
      url: '/api/search',
      body
    },
    fetcher,
    {
      keepPreviousData: false,
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 24 * 60 * 1000
    }
  )

  const onChangeQuery = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value)
    },
    []
  )

  const onClearQuery = React.useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
  }, [])

  React.useEffect(() => {
    const newQuery = {
      ...router.query,
      query: debouncedQuery
    }

    if (!debouncedQuery) {
      delete newQuery.query
    }

    router.replace(
      { pathname: router.pathname, query: newQuery },
      { pathname: router.pathname, query: newQuery },
      { shallow: true }
    )
  }, [debouncedQuery])

  const isEmpty = results && !results.length

  return {
    results,

    query,
    debouncedQuery,
    onChangeQuery,
    onClearQuery,

    error,
    isEmpty,
    isLoading,
    isValidating
  }
}

export const Search = createContainer(useSearch)
