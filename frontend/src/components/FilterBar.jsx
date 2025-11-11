import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { Chip } from './ui/chip'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion'
import { Calendar, Filter, X, CalendarRange, GraduationCap, Building2, Users, CheckCircle2, Clock, Sparkles, Search } from 'lucide-react'
import { format } from 'date-fns'

export default function FilterBar({ onFilterChange, onPeriodChange }) {
  const [filters, setFilters] = useState({
    date: '',
    start_date: '',
    end_date: '',
    year: '',
    department: '',
    division: '',
    status: '',
    search: '', // Student search term
  })

  const [period, setPeriod] = useState('daily')

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handlePeriodChange = (value) => {
    setPeriod(value)
    onPeriodChange(value)
  }

  const clearFilters = () => {
    const emptyFilters = {
      date: '',
      start_date: '',
      end_date: '',
      year: '',
      department: '',
      division: '',
      status: '',
      search: '',
    }
    setFilters(emptyFilters)
    onFilterChange(emptyFilters)
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  // Get active filter chips
  const getActiveFilterChips = () => {
    const chips = []
    
    // Period chip
    if (period && period !== 'daily') {
      chips.push({
        key: 'period',
        label: 'Period',
        value: period.charAt(0).toUpperCase() + period.slice(1),
        onRemove: () => handlePeriodChange('daily'),
        variant: 'secondary'
      })
    }

    // Date chips
    if (filters.date) {
      chips.push({
        key: 'date',
        label: 'Date',
        value: filters.date,
        onRemove: () => handleFilterChange('date', ''),
        variant: 'default'
      })
    }

    if (filters.start_date && filters.end_date) {
      chips.push({
        key: 'date_range',
        label: 'Date Range',
        value: `${filters.start_date} to ${filters.end_date}`,
        onRemove: () => {
          handleFilterChange('start_date', '')
          handleFilterChange('end_date', '')
        },
        variant: 'default'
      })
    } else {
      if (filters.start_date) {
        chips.push({
          key: 'start_date',
          label: 'Start Date',
          value: filters.start_date,
          onRemove: () => handleFilterChange('start_date', ''),
          variant: 'outline'
        })
      }
      if (filters.end_date) {
        chips.push({
          key: 'end_date',
          label: 'End Date',
          value: filters.end_date,
          onRemove: () => handleFilterChange('end_date', ''),
          variant: 'outline'
        })
      }
    }

    // Filter chips
    if (filters.year) {
      chips.push({
        key: 'year',
        label: 'Year',
        value: filters.year,
        onRemove: () => handleFilterChange('year', ''),
        variant: 'secondary'
      })
    }

    if (filters.department) {
      chips.push({
        key: 'department',
        label: 'Department',
        value: filters.department,
        onRemove: () => handleFilterChange('department', ''),
        variant: 'secondary'
      })
    }

    if (filters.division) {
      chips.push({
        key: 'division',
        label: 'Division',
        value: filters.division,
        onRemove: () => handleFilterChange('division', ''),
        variant: 'secondary'
      })
    }

    if (filters.status) {
      chips.push({
        key: 'status',
        label: 'Status',
        value: filters.status,
        onRemove: () => handleFilterChange('status', ''),
        variant: filters.status === 'Present' ? 'default' : 
                filters.status === 'Absent' ? 'outline' : 'secondary'
      })
    }

    if (filters.search) {
      chips.push({
        key: 'search',
        label: 'Search',
        value: filters.search,
        onRemove: () => handleFilterChange('search', ''),
        variant: 'outline'
      })
    }

    return chips
  }

  const activeChips = getActiveFilterChips()

  // Debug: Log active chips (remove in production)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Active filters:', filters)
    console.log('Active chips:', activeChips)
    console.log('Period:', period)
  }

  return (
    <div className="space-y-4">
      {/* Student Search - Quick Search Bar */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-gradient-to-br from-amber-600 to-orange-600">
              <Search className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <Label htmlFor="student-search" className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Search Students
              </Label>
              <Input
                id="student-search"
                type="text"
                placeholder="Search by name, student ID, or RFID UID..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find students by name, ID, or RFID card number
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Filter Chips - Compact Design */}
      {activeChips.length > 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs font-bold text-foreground">Active</span>
                <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-1.5 py-0.5 rounded-full">
                  {activeChips.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {activeChips.map((chip) => (
                  <Chip
                    key={chip.key}
                    variant={chip.variant}
                    onRemove={chip.onRemove}
                    size="sm"
                    className="animate-slide-in"
                  >
                    <span className="font-semibold text-xs">{chip.label}:</span>
                    <span className="font-normal text-xs">{chip.value}</span>
                  </Chip>
                ))}
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters - Accordion Layout */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <Accordion type="multiple" defaultValue={hasActiveFilters ? ["filters"] : []} className="w-full">
            <AccordionItem value="filters" className="border-b-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-gradient-to-br from-violet-600 to-purple-600">
                    <Filter className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-bold">Filters</span>
                  {hasActiveFilters && (
                    <span className="text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 px-2 py-0.5 rounded-full">
                      {activeChips.length} active
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                  {/* Date Search Card - Compact */}
                  <Card className="border shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-md bg-gradient-to-br from-purple-600 to-pink-600">
                          <Calendar className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-bold">Search by Date</span>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="date" className="text-xs font-semibold flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            Specific Date
                          </Label>
                          <Input
                            id="date"
                            type="date"
                            value={filters.date}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleFilterChange('start_date', '')
                                handleFilterChange('end_date', '')
                              }
                              handleFilterChange('date', e.target.value)
                            }}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="relative py-1">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border"></span>
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground text-[10px]">Or</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <CalendarRange className="h-3 w-3 text-muted-foreground" />
                            Date Range
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor="start_date" className="text-[10px] text-muted-foreground">From</Label>
                              <Input
                                id="start_date"
                                type="date"
                                value={filters.start_date}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleFilterChange('date', '')
                                  }
                                  handleFilterChange('start_date', e.target.value)
                                }}
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="end_date" className="text-[10px] text-muted-foreground">To</Label>
                              <Input
                                id="end_date"
                                type="date"
                                value={filters.end_date}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleFilterChange('date', '')
                                  }
                                  handleFilterChange('end_date', e.target.value)
                                }}
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Student Filters Card - Compact */}
                  <Card className="border shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-md bg-gradient-to-br from-emerald-600 to-teal-600">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-bold">Student Filters</span>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="year" className="text-xs font-semibold flex items-center gap-1.5">
                              <GraduationCap className="h-3 w-3 text-muted-foreground" />
                              Year
                            </Label>
                            <Select 
                              value={filters.year || undefined} 
                              onValueChange={(value) => handleFilterChange('year', value)}
                            >
                              <SelectTrigger id="year" className="h-9 text-sm">
                                <SelectValue placeholder="All" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FE">FE</SelectItem>
                                <SelectItem value="SE">SE</SelectItem>
                                <SelectItem value="TE">TE</SelectItem>
                                <SelectItem value="BE">BE</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="division" className="text-xs font-semibold flex items-center gap-1.5">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              Division
                            </Label>
                            <Select 
                              value={filters.division || undefined} 
                              onValueChange={(value) => handleFilterChange('division', value)}
                            >
                              <SelectTrigger id="division" className="h-9 text-sm">
                                <SelectValue placeholder="All" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A">A</SelectItem>
                                <SelectItem value="B">B</SelectItem>
                                <SelectItem value="C">C</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="department" className="text-xs font-semibold flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            Department
                          </Label>
                          <Select 
                            value={filters.department || undefined} 
                            onValueChange={(value) => handleFilterChange('department', value)}
                          >
                            <SelectTrigger id="department" className="h-9 text-sm">
                              <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Computer">Computer</SelectItem>
                              <SelectItem value="IT">IT</SelectItem>
                              <SelectItem value="Electronics">Electronics</SelectItem>
                              <SelectItem value="Mechanical">Mechanical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="status" className="text-xs font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                            Status
                          </Label>
                          <Select 
                            value={filters.status || undefined} 
                            onValueChange={(value) => handleFilterChange('status', value)}
                          >
                            <SelectTrigger id="status" className="h-9 text-sm">
                              <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Present">Present</SelectItem>
                              <SelectItem value="Absent">Absent</SelectItem>
                              <SelectItem value="Proxy">Proxy</SelectItem>
                              <SelectItem value="Bunk">Bunk</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Chart View Period - Always Visible */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold">Chart View Interval</span>
                <p className="text-xs text-muted-foreground">How charts display data</p>
              </div>
            </div>
            <Tabs value={period} onValueChange={handlePeriodChange}>
              <TabsList className="h-9 bg-white/50 dark:bg-slate-800/50">
                <TabsTrigger value="daily" className="px-3 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                  Daily
                </TabsTrigger>
                <TabsTrigger value="weekly" className="px-3 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                  Weekly
                </TabsTrigger>
                <TabsTrigger value="monthly" className="px-3 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                  Monthly
                </TabsTrigger>
                <TabsTrigger value="semester" className="px-3 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                  Semester
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

